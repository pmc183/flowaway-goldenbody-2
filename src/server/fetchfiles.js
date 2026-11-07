const fs = require("fs");
const path = require("path");
const fsp = require("fs/promises");
const { getUserUsage, getUserQuotaBytes } = require("./storageQuota");
const { withUserLock, writeFileWithQuota, createDirectoryWithQuota, deletePathWithQuota, copyPathWithQuota } = require("./quotaFs");

const MAX_BODY = 50 * 1024 * 1024;
const MIN_ENTRY_SIZE_BYTES = 4 * 1024;

function getEntryDiskSizeBytes(size) {
  const numeric = Number(size);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return MIN_ENTRY_SIZE_BYTES;
  }
  return numeric + MIN_ENTRY_SIZE_BYTES;
}

async function exists(fullPath) {
  try {
    await fsp.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
async function move(src, dest) {
  try {
    await fsp.rename(src, dest);
  } catch (err) {
    if (err.code === "EXDEV") {
      await fsp.cp(src, dest, { recursive: true });
      await fsp.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}
function sendSafeError(res, err, fallbackStatus = 500) {
  if (res.headersSent) return;

  let status = fallbackStatus;
  let message = "Operation failed";

  if (err?.code === "EACCES") {
    status = 403;
    message = "Permission denied";
  } else if (err?.code === "ENOENT") {
    status = 404;
    message = "File or folder not found";
  } else if (err?.code === "EEXIST") {
    status = 409;
    message = "File or folder already exists";
  } else if (err?.code === "ENOTDIR") {
    status = 400;
    message = "Invalid path";
  } else if (err?.code === "EINVAL") {
    status = 400;
    message = "Invalid operation";
  } else if (err?.code === "QUOTA_EXCEEDED") {
    status = 413;
    message = "Out of storage";
  }

  console.error("Filesystem operation failed:", err);

  res.writeHead(status, {
    "Content-Type": "application/json",
  });

  res.end(JSON.stringify({
    error: message,
  }));
}

const limit = createLimiter(32);
function safeResolve(root, userPath = "") {
  const resolvedRoot = path.resolve(root);
  const raw = String(userPath ?? "");
  const relative = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = relative ? path.resolve(resolvedRoot, relative) : resolvedRoot;

  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid path");
  }

  return resolved;
}
function createLimiter(maxConcurrent = 64, maxQueue = 2000) {
  let active = 0;
  const queue = [];

  return async (fn) => {
    if (active >= maxConcurrent) {
      if (queue.length >= maxQueue) {
        throw new Error("Too many pending operations");
      }
      await new Promise((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
async function buildUserFileTree(rootPath) {
  const root = ["root", []];

  const queue = [{
    path: rootPath,
    children: root[1],
  }];

  let index = 0;

  const MAX_CONCURRENT_DIRS = 4;
  const MAX_ENTRIES_PER_BATCH = 32;

  async function processDirectory({ path: dir, children }) {
    let entries;

    try {
      entries = await limit(() =>
        fsp.readdir(dir, { withFileTypes: true })
      );
    } catch (err) {
      console.error("Failed to read directory:", dir, err);
      return [];
    }

    const directories = [];

    // Process entries in bounded batches.
    for (let i = 0; i < entries.length; i += MAX_ENTRIES_PER_BATCH) {
      const batch = entries.slice(i, i + MAX_ENTRIES_PER_BATCH);

      const results = await Promise.all(
        batch.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);

          let stat;

          try {
            stat = await limit(() => fsp.stat(fullPath));
          } catch (err) {
            console.error("Failed to stat entry:", fullPath, err);
            return null;
          }

          if (entry.isDirectory()) {
            const dirChildren = [];

            return {
              node: [
                entry.name,
                dirChildren,
                { mtime: stat.mtimeMs },
              ],
              directory: {
                path: fullPath,
                children: dirChildren,
              },
            };
          }

          return {
            node: [
              entry.name,
              null,
              {
                size: stat.size,
                sizeOnDisk: getEntryDiskSizeBytes(stat.size),
                mtime: stat.mtimeMs,
              },
            ],
            directory: null,
          };
        })
      );

      for (const result of results) {
        if (!result) continue;

        children.push(result.node);

        if (result.directory) {
          directories.push(result.directory);
        }
      }
    }

    return directories;
  }

  while (index < queue.length) {
    const batch = queue.slice(
      index,
      index + MAX_CONCURRENT_DIRS
    );

    index += batch.length;

    const results = await Promise.all(
      batch.map(processDirectory)
    );

    for (const directories of results) {
      queue.push(...directories);
    }
  }

  return root;
}

async function getDirRealSizeBytes(root) {
  async function walk(dir) {
    let entries;

    try {
      entries = await limit(() => fsp.readdir(dir, { withFileTypes: true }));
    } catch {
      return 0;
    }

    const sizes = await Promise.all(
      entries.map(async (entry) => {
        const full = safeResolve(dir, entry.name);

        if (entry.isDirectory()) {
          return walk(full);
        }

        if (entry.isFile()) {
          try {
            const stat = await limit(() => fsp.lstat(full));
            return stat.size;
          } catch {
            return 0;
          }
        }

        return 0;
      })
    );

    return sizes.reduce((a, b) => a + b, 0);
  }

  return walk(root);
}

async function getDirSizeBytes(root) {
  return getEntryDiskSizeBytes(await getDirRealSizeBytes(root));
}

async function authenticateUser(username, providedPassword, authHeader) {
  if (!username) return false;

  try {
    const userFile = safeResolve(directoryPath, `${username}/${username}.txt`);
    const txt = await fsp.readFile(userFile, "utf8");
    const obj = JSON.parse(txt);

    if (!obj || typeof obj.password !== "string") return false;

    if (providedPassword === obj.password) return true;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      const now = Date.now();

      return Array.isArray(obj.authTokens) &&
        obj.authTokens.some(
          t => t.token === token && t.expires > now
        );
    }

    return false;
  } catch {
    return false;
  }
}

let directoryPath = path.resolve(__dirname, "./zmcdfiles");
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

function removeUnwantedStuffInPath(value) {
  let raw = String(value ?? "")
    .replace(/\\/g, "/")
    .trim();

  if (!raw) return "/";

  if (raw.startsWith("root/")) {
    raw = raw.slice(5);
  }

  const normalized = path.posix.normalize(raw.startsWith("/") ? raw : `/${raw}`);

  return normalized === "." ? "/" : normalized;
}

function stripLeadingSlash(value) {
  const text = String(value ?? "");
  return text.replace(/^\/+/, "");
}

function isRootContainerPath(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).replace(/\\/g, "/").trim();
  if (!text || text === "/") return true;
  const normalized = stripLeadingSlash(text);
  return normalized === "" || normalized === "root";
}

function isExistingAppFolderPath(userRoot, normalizedPath) {
  if (!normalizedPath || typeof normalizedPath !== "string") return false;

  const appsRoot = "/systemfiles/runtime/apps";
  if (!normalizedPath.startsWith(appsRoot)) return false;

  const relative = normalizedPath.slice(appsRoot.length).replace(/^\/+/, "");
  if (!relative) return false;

  const firstSegment = relative.split("/")[0];
  if (!firstSegment) return false;

  const candidatePath = safeResolve(userRoot, `systemfiles/runtime/apps/${firstSegment}`);

  try {
    const stat = fs.statSync(candidatePath);
    return Boolean(stat && stat.isDirectory());
  } catch {
    return false;
  }
}

function requiresPasswordForAppsWrite(userRoot, normalizedPath) {
  if (!normalizedPath || typeof normalizedPath !== "string") return false;
  if (!normalizedPath.startsWith("/systemfiles/runtime/apps")) return false;

  const relative = normalizedPath.slice("/systemfiles/runtime/apps".length).replace(/^\/+/, "");
  if (!relative) return false;

  if (!relative.includes("/")) {
    return false;
  }

  return !isExistingAppFolderPath(userRoot, normalizedPath);
}

function requiresPasswordForAppsFolderCreate(userRoot, normalizedPath) {
  if (!normalizedPath || typeof normalizedPath !== "string") return false;
  if (!normalizedPath.startsWith("/systemfiles/runtime/apps")) return false;

  return !isExistingAppFolderPath(userRoot, normalizedPath);
}

function getPermissionForRelativePath(relPath, permissionEntries) {
  const normalizedTarget = removeUnwantedStuffInPath(relPath);

  let matched = null;

  for (const row of permissionEntries || []) {
    const base = removeUnwantedStuffInPath(row && row.path);

    const isMatch = normalizedTarget === base || normalizedTarget.startsWith(`${base}/`);

    if (!isMatch) continue;

    if (!matched || base.length > matched.path.length) {
      matched = {
        path: base,
        perm: {
          read: row.perm?.read !== false,
          write: row.perm?.write !== false,
        },
      };
    }
  }

  // No matching permission
  if (!matched) {
    return {
      read: true,
      write: true,
    };
  }

  return matched.perm;
}

// Server-side clipboard storage: persist clipboard per user across requests
const userClipboards = new Map(); // username -> clipboard state

// ─────────────────────────────
// Helpers
// ─────────────────────────────

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("aborted", () => {
      reject(new Error("Request aborted by client"));
    });
  });
}

async function handleRawFileUpload(req, res) {
  function base64ToUtf8(base64Str) {
    return Buffer.from(base64Str, "base64").toString("utf8");
  }
  const headers = req.headers || {};
  const username = String(headers["x-username"] || "").trim();
  const password = String(headers["x-password"] || "").trim();
  const authHeader = headers.authorization || headers.Authorization || "";
  const relPath = base64ToUtf8(String(headers["x-file-path"] || "").trim());

  if (!username || !relPath) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Missing username or file path" }));
  }

  if (!(await authenticateUser(username, password, authHeader))) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  const normalizedPath = removeUnwantedStuffInPath(relPath);
  const userRoot = safeResolve(directoryPath, `${username}/root`);

  const authFilePath = safeResolve(directoryPath, `${username}/${username}.txt`);
  let userPathPermissions = [];
  let authObj = null;
  try { authObj = JSON.parse(await fsp.readFile(authFilePath, 'utf8')); userPathPermissions = authObj.pathPermissions; } catch (e) { }

  const permission = getPermissionForRelativePath(normalizedPath, userPathPermissions);
  if (!permission.write) {
    res.writeHead(403);
    return res.end(
      JSON.stringify({
        error: "write permission denied",
        path: `${normalizedPath}`,
      }),
    );
  }

  // Require explicit password (not token) when writing under /systemfiles/runtime/apps,
  // except when the path is inside an already-created app folder.
  if (requiresPasswordForAppsWrite(userRoot, normalizedPath) && (!authObj || password !== authObj.password)) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: "password required for folder writes to /systemfiles/runtime/apps" }));
  }

  const replace = String(headers["x-file-replace"] || "true") !== "false";
  const filePath = safeResolve(userRoot, normalizedPath);
  
  const rawBody = await getRawBody(req);

  let oldSize = 0;

  return withUserLock(username, async () => {
    const { loadTreeRequired } = await writeFileWithQuota(username, userRoot, filePath, rawBody, replace);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, loadTreeRequired }));
  });
}

// ─────────────────────────────
// Server
// ─────────────────────────────

async function handleFetchfiles(req, res) {
  const jsonResponse = (payload, status = 200) => {
    res.setHeader("Content-Type", "application/json");
    if (status !== 200) res.writeHead(status);
    return res.end(JSON.stringify(payload));
  };

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Username, X-File-Path, X-File-Replace, X-File-Action");
  res.setHeader("Access-Control-Expose-Headers", "X-File-Size,X-Chunk-Index,X-Is-Last-Chunk,X-Total-Chunks");

  // Support simple streaming download endpoint for large files.
  if (req.method === "POST" && req.headers["content-type"] && req.headers["content-type"].startsWith("application/octet-stream") && req.headers["x-file-action"] === "write") {
    return handleRawFileUpload(req, res);
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end();
  }

  let chunks = [];
  let total = 0;
  req.on("data", (chunk) => { 
    total += chunk.length;
    if (total > MAX_BODY) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString("utf8");
    let data;

    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    if (!data || typeof data !== "object") {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid request body" }));
    }

    const username = typeof data.username === "string" ? data.username.trim() : "";
    if (!username) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Missing username" }));
    }

    // Authenticate all POST actions. If the user has a password set
    // in their user file (username.txt) it must match `data.password`.
    const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
    if (!(await authenticateUser(username, data.password, authHeader))) {
      res.writeHead(401);
      return res.end(JSON.stringify({ error: "unauthorized" }));
    }

    const authFilePath = safeResolve(directoryPath, `${username}/${username}.txt`);

    let userPathPermissions = [];
    let authObj = null;
    try {
      const authContent = await fsp.readFile(authFilePath, "utf8");
      authObj = JSON.parse(authContent);
      userPathPermissions = authObj && authObj.pathPermissions;
    } catch (e) {
      userPathPermissions = [];
      authObj = null;
    }

    const userRoot = path.join(directoryPath, username, "root");
    await fsp.mkdir(userRoot, { recursive: true });

    try {
      if (data.initFE) {
        const tree = await buildUserFileTree(userRoot);
        const clipboard = userClipboards.get(username) || null;
        return res.end(JSON.stringify({ tree, clipboard }));
      }

      if (data.requestFile) {
        const normalizedRequestPath = removeUnwantedStuffInPath(data.requestFileName);

        const permission = getPermissionForRelativePath(normalizedRequestPath, userPathPermissions);

        if (!permission.read) return jsonResponse({ error: "read permission denied", path: `${normalizedRequestPath}` }, 403);

        const fullPath = safeResolve(userRoot, normalizedRequestPath);

        let stat;
        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e?.code === "ENOENT") return jsonResponse({ missing: true, code: "ENOENT", kind: "missing", requestFileName: data.requestFileName }, 404);
          throw e;
        }

        if (stat.isDirectory()) {
          const dirents = await fsp.readdir(fullPath, { withFileTypes: true });

          const files = dirents.map((d) => ({
            name: d.name,
            type: d.isDirectory() ? "folder" : "file",
            relativePath: d.name,
          }));

          return jsonResponse({ kind: "folder", files });
        }

        if (!stat.isFile()) {
          return jsonResponse({ error: "Unsupported path type" }, 400);
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", String(stat.size));

        return fs.createReadStream(fullPath).pipe(res);
      }

      if (data.requestFolder) {
        const normalizedRequestPath = removeUnwantedStuffInPath(data.requestFolderName);

        const wantDetails = Boolean(data.detail || data.wantDetails);

        const relForPerm = normalizedRequestPath || "";

        const permission = getPermissionForRelativePath(relForPerm, userPathPermissions);
        if (!permission.read) {
          res.writeHead(403);
          return res.end(
            JSON.stringify({
              error: "read permission denied",
              path: `${relForPerm}`,
            }),
          );
        }

        const fullPath = safeResolve(userRoot, normalizedRequestPath);


        let stat;

        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e?.code === "ENOENT") {
            return res.end(
              JSON.stringify({
                missing: true,
                code: "ENOENT",
                kind: "missing",
                requestFolderName: data.requestFolderName,
              }),
            );
          }
          throw e;
        }

        if (!stat.isDirectory()) {
          return res.end(
            JSON.stringify({
              error: "Not a directory",
              path: `${relForPerm}`,
            }),
          );
        }

        const dirents = await fsp.readdir(fullPath, { withFileTypes: true });

        if (!wantDetails) {
          const files = dirents.map((d) => stripLeadingSlash(d.name));

          return res.end(
            JSON.stringify({
              kind: "folder",
              files,
            }),
          );
        }

        const files = await limit(() => Promise.all(
          dirents.map(async (d) => {
            const entryPath = stripLeadingSlash(d.name);

            const type = d.isDirectory() ? "folder" : "file";

            const result = {
              path: entryPath,
              type,
            };

            try {
              const entryStat = await fsp.stat(safeResolve(fullPath, d.name));

              result.mtime = entryStat.mtimeMs;

              if (type === "file") {
                result.size = entryStat.size;
                result.sizeOnDisk = getEntryDiskSizeBytes(entryStat.size);
              }

              if (type === "folder") {
                const folderPath = safeResolve(fullPath, d.name);
                if (data.directoryDetail) {
                  const folderRealSize = await getDirRealSizeBytes(folderPath);
                  result.size = folderRealSize;
                  result.sizeOnDisk = getEntryDiskSizeBytes(folderRealSize);
                }
              }
            } catch {}

            return result;
          }),
        ));
        return res.end(
          JSON.stringify({
            kind: "folder",
            files,
          }),
        );
      }

      async function ensureDir(p) {
        await fsp.mkdir(p, { recursive: true });
      }

      async function applyDirections(rootPath, directions, username, userPathPermissions, options = {}) {
        let success = true;
        let error = null;
        const moveMode = Boolean(options && options.move);
        // result object used to return information back to the caller
        const result = {};
        // Initialize clipboard from server storage or create new
        let clipboard = userClipboards.get(username) || null;

        const normalizePathInput = (p = "") => {
          if (!p || p === "root") return "";

          let text = String(p).replace(/\\/g, "/").trim();
          while (text.startsWith("/")) text = text.slice(1);
          if (text.startsWith("root/")) text = text.slice(5);
          return text;
        };

        const resolvePath = (p = "") => {
          const normalized = normalizePathInput(p);
          if (!normalized) return rootPath;
          return safeResolve(rootPath, normalized);
        };

        const directionPathToRelative = (p = "") => {
          const normalized = normalizePathInput(p);
          if (!normalized) return "";
          return removeUnwantedStuffInPath(normalized);
        };

        const isImmediateRootChild = (relativePath) => removeUnwantedStuffInPath(relativePath) === "/root";
        const assertNotImmediateRootChild = (relativePath, action) => {
          if (isImmediateRootChild(relativePath)) {
            const err = new Error(`Cannot ${action} item named 'root' at the top level`);
            err.code = "EINVAL";
            throw err;
          }
        };

        const assertReadAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.read) {
            const err = new Error(`Read permission denied: ${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        const assertWriteAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.write) {
            const err = new Error(`Write permission denied: ${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        try {
          for (const dir of directions) {
            if (dir.addFolder) {
              let parentPath;
              let folderPath;

              if (dir.name && dir.name.length) {
                parentPath = resolvePath(dir.path || "root");
                folderPath = safeResolve(parentPath, dir.name);
              } else {
                const requestedPath = typeof dir.path === "string" ? dir.path : "";
                const normalizedRequestedPath = removeUnwantedStuffInPath(requestedPath);
                folderPath = resolvePath(requestedPath);
                parentPath = path.dirname(folderPath);
              }

              const parentRel = removeUnwantedStuffInPath(path.relative(rootPath, parentPath || rootPath).replace(/\\/g, "/"));
              const folderRel = removeUnwantedStuffInPath(path.relative(rootPath, folderPath || rootPath).replace(/\\/g, "/"));
              assertNotImmediateRootChild(folderRel, "create");
              assertWriteAllowed(parentRel);

              await ensureDir(parentPath || rootPath);

              // If an entry exists at the target path, ensure it's a directory.
              if (await exists(folderPath)) {
                const existingStat = await fsp.stat(folderPath);

                if (!existingStat.isDirectory()) {
                  success = false;
                  error = `Cannot create folder at ${folderRel}: a file exists at that path`;
                  continue;
                }
              } else {
                await createDirectoryWithQuota(username, userRoot, folderPath);
              }

              continue;
            }
            if (dir.deleteFolder) {
              dir.delete = true;
            }
            if (dir.checkFolder) {
              const folderPath = resolvePath(dir.path);
              const folderRel = directionPathToRelative(dir.path || "");
              assertReadAllowed(folderRel);
              const stat = await fsp.stat(folderPath).catch(() => null);
              if (!stat || !stat.isDirectory()) result.checkFolder = { exists: false, path: `${folderRel}` };
              else result.checkFolder = { exists: true, path: `${folderRel}` };
              continue;
            }

            if (dir.checkFile) {
              const filePath = resolvePath(dir.path);
              const fileRel = directionPathToRelative(dir.path || "");
              assertReadAllowed(fileRel);
              console.log(filePath, fileRel);
              const stat = await fsp.stat(filePath).catch(() => null);
              if (!stat || !stat.isFile()) result.checkFile = { exists: false, path: `${fileRel}` };
              else result.checkFile = { exists: true, path: `${fileRel}` };
              continue;
            }
            if (dir.addFile) {
              const fileRel = directionPathToRelative(dir.path || "");
              assertNotImmediateRootChild(fileRel, "create");
              assertWriteAllowed(fileRel);
              const filePath = resolvePath(dir.path);
              await writeFileWithQuota(username, userRoot, filePath, "", true);
              continue;
            }

            if (dir.renameFolder) {
              dir.rename = true;
            }

            if (dir.rename) {
              if (isRootContainerPath(dir.path)) {
                success = false;
                error = "Cannot rename the root directory";
                continue;
              }

              const oldPath = resolvePath(dir.path);
              const oldRel = directionPathToRelative(dir.path || "");
              assertWriteAllowed(oldRel);

              const newName = path.basename(String(dir.newName || "").trim());

              if (!newName || newName === "." || newName === "..") {
                success = false;
                error = "Invalid new name for rename";
                continue;
              }

              // Prevent hidden traversal attempts like ../file or folder/file
              if (newName !== dir.newName) {
                success = false;
                error = "Invalid new name for rename";
                continue;
              }

              const parentDir = path.dirname(oldPath);
              const newPath = safeResolve(parentDir, newName);

              const newRel = path.join(path.dirname(oldRel), newName).replace(/\\/g, "/");
              assertNotImmediateRootChild(newRel, "rename to");
              assertWriteAllowed(removeUnwantedStuffInPath(newRel));

              await fsp.rename(oldPath, newPath);

              // Update any server-side clipboard entries that reference the renamed path
              try {
                if (clipboard && typeof clipboard.path === "string") {
                  // Update single-object clipboard path if it references the renamed item
                  if (clipboard.path === oldRel) {
                    clipboard = { ...clipboard, path: newRel, name: dir.newName };
                  } else if (clipboard.path.startsWith(oldRel + "/")) {
                    clipboard = { ...clipboard, path: newRel + clipboard.path.slice(oldRel.length) };
                  }
                }
              } catch (e) {
                // ignore clipboard update failures
              }
              continue;
            }

            if (dir.delete) {
              if (isRootContainerPath(dir.path)) {
                success = false;
                error = "Cannot delete the root directory";
                continue;
              }

              const deleteRelPath = directionPathToRelative(dir.path || "");
              assertWriteAllowed(deleteRelPath);
              const targetPath = resolvePath(dir.path);
              const relativeTarget = path.relative(rootPath, targetPath).replace(/\\/g, "/");
              if (relativeTarget === "systemfiles") {
                continue; // prevent deleting root 'systemfiles' folder only
              }
              const targetExists = await exists(targetPath);
              if (!targetExists) {
                success = false;
                error = "Target path does not exist";
                continue;
              }
              // Move to hidden .trash folder instead of permanently deleting
              const trashDir = safeResolve(rootPath, ".trash");
              await fsp.mkdir(trashDir, { recursive: true });
              const itemName = path.basename(targetPath);
              let trashDest = safeResolve(trashDir, itemName);
              // Avoid overwriting existing trash items by appending a timestamp
              if (await exists(trashDest)) {
                trashDest = safeResolve(trashDir, `${Date.now()}_${itemName}`);
              }
              try {
                await fsp.rename(targetPath, trashDest);
              } catch (e) {
                if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
                  success = false;
                  error = "Target path does not exist or is not a directory";
                  continue;
                }
                try {
                  await move(targetPath, trashDest);
                } catch (moveErr) {
                  console.error("soft-delete move failed", {
                    targetPath,
                    trashDest,
                    error: moveErr && (moveErr.stack || moveErr.message || String(moveErr)),
                  });
                  success = false;
                  error = "Failed to move item to trash";
                  continue;
                }
              }

              // Clean up server-side single-object clipboard if it references the deleted path
              try {
                const rel = dir.path.split("/").slice(1).join("/"); // remove leading "root"
                if (clipboard && typeof clipboard.path === "string") {
                  if (clipboard.path === rel || clipboard.path.startsWith(rel + "/")) {
                    clipboard = null;
                  }
                }
              } catch (e) {
                // ignore cleanup failures
              }

              continue;
            }

            if (dir.permanentDelete) {
              const deleteRelPath = directionPathToRelative(dir.path || "");
              assertWriteAllowed(deleteRelPath);
              const targetPath = resolvePath(dir.path);
              // Security: only allow permanent deletion of items inside .trash
              const trashDir = safeResolve(rootPath, ".trash");
              const normalizedTarget = path.resolve(targetPath);
              const normalizedTrash = path.resolve(trashDir);
              if (!normalizedTarget.startsWith(normalizedTrash + path.sep) && normalizedTarget !== normalizedTrash) {
                // Not inside .trash — refuse
                success = false;
                error = "Cannot permanently delete items outside the trash directory";
                continue;
              }
              await deletePathWithQuota(username, userRoot, targetPath);
              continue;
            }

            if (dir.restore) {
              const restoreRelPath = directionPathToRelative(dir.path || "");
              assertWriteAllowed(restoreRelPath);
              const targetPath = resolvePath(dir.path);
              // Security: only restore items that are inside .trash
              const trashDir = safeResolve(rootPath, ".trash");
              const normalizedTarget = path.resolve(targetPath);
              const normalizedTrash = path.resolve(trashDir);
              if (!normalizedTarget.startsWith(normalizedTrash + path.sep)) {
                success = false;
                error = "Cannot restore items outside the trash directory";
                continue; // refuse to restore items not in .trash
              }
              const itemName = path.basename(targetPath);
              let dest = safeResolve(rootPath, itemName);
              // Avoid overwriting by appending a numeric suffix
              if (await exists(dest)) {
                let n = 1;
                while (await exists(safeResolve(rootPath, `(${n}) ${itemName}`))) n++;
                dest = safeResolve(rootPath, `(${n}) ${itemName}`);
              }
              await fsp.rename(targetPath, dest);
              continue;
            }

            if (dir.copy) {
              const entry = dir.directions;

              if (typeof entry === "string") {
                const copyRelPath = removeUnwantedStuffInPath(entry);
                assertReadAllowed(copyRelPath);
                clipboard = { path: copyRelPath, kind: "file", type: "file" };
                continue;
              }

              if (!entry || Array.isArray(entry) || typeof entry !== "object") {
                success = false;
                error = "Invalid clipboard entry";
                continue;
              }

              const copyRelPath = removeUnwantedStuffInPath(entry && entry.path ? entry.path : "");
              assertReadAllowed(copyRelPath);
              clipboard = entry;
              continue;
            }

            if (dir.pasteFolder) {
              dir.paste = true;
            }
            if (dir.paste && clipboard) {
              if (isRootContainerPath(dir.path) || isRootContainerPath(clipboard.path)) {
                success = false;
                error = "Cannot replace \"/\" or use \"/\" as clipboard source";
                continue;
              }

              const destinationRelPath = directionPathToRelative(dir.path || "root");
              assertWriteAllowed(destinationRelPath);

              const destinationPath = resolvePath(dir.path || "root");
              const destinationExists = await exists(destinationPath);
              const destinationStat = destinationExists ? await fsp.stat(destinationPath).catch(() => null) : null;

              const quota = await getUserQuotaBytes(userRoot);
              let currentUsed = await getUserUsage(username, userRoot);

              // Single-object clipboard paste
              const item = clipboard;
              if (!item || typeof item.path !== "string") {
                success = false;
                error = "Invalid clipboard item";
                continue;
              }

              const sourceRelPath = removeUnwantedStuffInPath(item.path || "");
              assertReadAllowed(sourceRelPath);

              const src = safeResolve(userRoot, item.path);
              if (!(await exists(src))) {
                success = false;
                error = "Source path does not exist";
                continue;
              }

              const itemKind = item && (item.kind || item.type || "file");
              const originalDestPath = String(dir.path || "root");

              // New behavior: paste/move should place source at the destination path directly
              // and must fail if the destination already exists.
              let dest = destinationPath;
              const normalizedSrc = path.resolve(src);
              const normalizedDest = path.resolve(dest);

              // A move like "mv . __pub2" is represented as a target nested under the source
              // path (source/current-dir + new name). In that case, we must treat it as a
              // rename of the source to its parent directory with the requested basename.
              if (normalizedDest === normalizedSrc || normalizedDest.startsWith(normalizedSrc + path.sep)) {
                const requestedName = path.basename(normalizedDest) || path.basename(normalizedSrc);
                const renameTarget = path.resolve(path.dirname(normalizedSrc), requestedName);
                if (renameTarget !== normalizedSrc && !renameTarget.startsWith(normalizedSrc + path.sep)) {
                  dest = renameTarget;
                }
              }

              // Ensure parent directory exists
              const parentDir = path.dirname(dest);
              await ensureDir(parentDir);
              if (await exists(dest)) {
                success = false;
                error = 'Destination already exists';
              }

              const destRelPath = removeUnwantedStuffInPath(path.relative(userRoot, dest).replace(/\\/g, "/"));
              assertWriteAllowed(destRelPath);

              const moveFlag = Boolean(dir.move ?? moveMode);
              if (moveFlag) {
                try {
                  const normalizedSrcAfter = path.resolve(src);
                  const normalizedDestAfter = path.resolve(dest);
                  if (normalizedDestAfter.startsWith(normalizedSrcAfter + path.sep) || normalizedDestAfter === normalizedSrcAfter) {
                    success = false;
                    error = "Cannot move an item into itself";
                    continue;
                  }

                  await move(src, dest);
                  continue;
                } catch (e) {
                  success = false;
                  error = e && e.message ? e.message : "Move failed";
                  continue;
                }
              }

              try {
                currentUsed = await copyPathWithQuota(username, userRoot, src, dest, currentUsed);
              } catch (err) {
                if (err?.code === "QUOTA_EXCEEDED") {
                  success = false;
                  error = "Out of storage";
                } else {
                  throw err;
                }
              }

              continue;
            }
          // Persist clipboard to server storage for this user
        }     
        } finally {
          // Include clipboard in result so client can sync it
          if (clipboard) {
            userClipboards.set(username, clipboard);
          } else {
            userClipboards.delete(username);
          }
        }
        result.success = success;
        result.error = error;
        return result;
      }

      if (data.saveSnapshot) {
        // If any addFolder under /systemfiles/runtime/apps is present, require the user's password
        // unless the target is inside an already-created app folder.
        const dirs = Array.isArray(data.directions) ? data.directions : [];
        const needsPw = dirs.some((d) => {
          if (!d.addFolder && !d.paste && !d.addFile) return false;

          const baseTarget = removeUnwantedStuffInPath(d.path || '');
          if (baseTarget.startsWith('/systemfiles/runtime/apps')) {
            return requiresPasswordForAppsFolderCreate(userRoot, baseTarget);
          }

          const combinedTarget = d.name
            ? removeUnwantedStuffInPath(`${d.path || ''}/${d.name}`)
            : '';

          return combinedTarget.startsWith('/systemfiles/runtime/apps') && requiresPasswordForAppsFolderCreate(userRoot, combinedTarget);
        });

        if (needsPw && (!authObj || data.password !== authObj.password)) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: 'password required for creating folders in /systemfiles/runtime/apps' }));
        }

        const result = await withUserLock(username, () => applyDirections(userRoot, data.directions, username, userPathPermissions, { move: Boolean(data.move) }));

        const safePayload = {
          success: result.success,
          error: result.error || (result.success === false ? "Operation failed" : undefined),
          result: {
            ...(result.checkFolder ? { checkFolder: result.checkFolder } : {}),
            ...(result.checkFile ? { checkFile: result.checkFile } : {}),
          }
        };

        return res.end(JSON.stringify(safePayload));
      }

      res.writeHead(400);
      res.end(JSON.stringify({ error: "Unknown action" }));
      } catch (err) {
        sendSafeError(res, err);
      }
  });
}

module.exports = {
  handleFetchfiles
};