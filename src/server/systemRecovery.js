const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

function getUserShard(username) {
  return crypto
    .createHash('sha256')
    .update(String(username))
    .digest('hex')
    .slice(0, 3);
}

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function pathInside(base, candidate) {
  const relative = path.relative(base, candidate);

  return (
    relative !== '' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function copyDirRecursive(srcDir, dstDir) {

  const resolvedSrcDir = path.resolve(srcDir);
  const resolvedDstDir = path.resolve(dstDir);
  if (resolvedSrcDir === resolvedDstDir) return;

  if (await pathExists(dstDir)) {
    await fs.promises.rm(dstDir, { recursive: true, force: true });
  }

  await fs.promises.mkdir(dstDir, { recursive: true });
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      await fs.promises.mkdir(path.dirname(dstPath), { recursive: true });
      await fs.promises.copyFile(srcPath, dstPath);
    }
  }
}

async function appRequestsAdminPerm(appDirPath) {
  const entryJsonPath = path.join(appDirPath, 'entry.json');
  const entry = (await pathExists(entryJsonPath)) ? await readJsonSafe(entryJsonPath) : null;
  return Boolean(entry && entry.requestAdminPerm);
}

async function syncAppJsKey(appDirPath, masterKey) {
  const jsKeyPath = path.join(appDirPath, 'jsKey.txt');
  if (masterKey) {
    await fs.promises.writeFile(jsKeyPath, masterKey, 'utf8');
  } else if (await pathExists(jsKeyPath)) {
    await fs.promises.rm(jsKeyPath, { force: true });
  }
}

function normalizeValue(value) {
  return String(value || '').toLowerCase();
}

async function collectSystemAppDefinitions(appsRoot) {

  const entries = await fs.promises.readdir(appsRoot, { withFileTypes: true });
  const definitions = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const appDirPath = path.join(appsRoot, entry.name);
    const entryPath = path.join(appDirPath, 'entry.json');
    const entryData = await readJsonSafe(entryPath);
    const functionName = typeof entryData.functionName === 'string'
      ? entryData.functionName
      : '';
    const label = typeof entryData.label === 'string'
      ? entryData.label
      : entry.name;

    definitions.push({
      id: functionName || entry.name,
      label,
      folderName: entry.name,
      appDirPath,
      entryPath,
    });
  }

  return definitions;
}

function findMatchingAppDefinition(definitions, appIdentifier) {
  if (!definitions.length || !appIdentifier) return null;
  const normalizedInput = typeof appIdentifier === 'object'
    ? [appIdentifier.id, appIdentifier.functionName, appIdentifier.label, appIdentifier.folderName]
    : [appIdentifier];

  for (const candidate of normalizedInput) {
    if (!candidate) continue;
    const normalizedCandidate = normalizeValue(candidate);
    const match = definitions.find((definition) => {
      const values = [definition.id, definition.label, definition.folderName];
      return values.some((value) => normalizeValue(value) === normalizedCandidate);
    });
    if (match) return match;
  }

  return null;
}

function getRecoveryPaths(options = {}) {
  const userRoot = options.userRoot;
  const sampleRoot = options.sampleRoot;

  return {
    userRoot,
    sampleRoot,
    appsRoot: options.appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps'),
    sampleAppsRoot: options.sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps'),
    brokenAppsRoot: options.brokenAppsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps'),
  };
}

async function splitRecoveryAppDefinitions(options = {}) {
  const { appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const userDefinitions = await collectSystemAppDefinitions(appsRoot);
  const sampleDefinitions = await collectSystemAppDefinitions(sampleAppsRoot);
  const sampleIds = new Set(sampleDefinitions.map((definition) => normalizeValue(definition.id)));
  const sampleFolderNames = new Set(sampleDefinitions.map((definition) => normalizeValue(definition.folderName)));

  const systemApps = [];
  const nonSystemApps = [];

  for (const definition of userDefinitions) {
    const normalizedId = normalizeValue(definition.id);
    const normalizedFolderName = normalizeValue(definition.folderName);
    if (sampleIds.has(normalizedId) || sampleFolderNames.has(normalizedFolderName)) {
      systemApps.push(definition);
    } else {
      nonSystemApps.push(definition);
    }
  }

  return { systemApps, nonSystemApps };
}

async function getRecoveryCatalog(options = {}) {
  const { appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const sampleDefinitions = await collectSystemAppDefinitions(sampleAppsRoot);
  const userDefinitions = await collectSystemAppDefinitions(appsRoot);

  const userDefinitionsByKey = new Map();
  for (const definition of userDefinitions) {
    userDefinitionsByKey.set(normalizeValue(definition.folderName), definition);
    userDefinitionsByKey.set(normalizeValue(definition.id), definition);
  }

  const systemApps = sampleDefinitions.map((definition) => {
    const normalizedId = normalizeValue(definition.id);
    const normalizedFolderName = normalizeValue(definition.folderName);
    return userDefinitionsByKey.get(normalizedFolderName)
      || userDefinitionsByKey.get(normalizedId)
      || definition;
  });

  return systemApps.map((definition) => ({
    id: definition.id,
    label: definition.label,
    folderName: definition.folderName,
  }));
}

async function getNonSystemRecoveryCatalog(options = {}) {
  const { nonSystemApps } = await splitRecoveryAppDefinitions(options);
  return nonSystemApps.map((definition) => ({
    id: definition.id,
    label: definition.label,
    folderName: definition.folderName,
  }));
}

async function createDirectoryBackupZip(entries, backupFileName = 'backup.zip') {
  const zip = new AdmZip();
  const sourceEntries = Array.isArray(entries) ? entries : [entries];

  for (const entry of sourceEntries) {
    if (!entry || !entry.path || !(await pathExists(entry.path))) continue;
    const zipRootName = entry.rootName || path.basename(entry.path);
    zip.addLocalFolder(entry.path, zipRootName);
  }

  const zipEntries = zip.getEntries();
  if (!zipEntries || !zipEntries.length) return null;

  return {
    backupFileName,
    backupData: zip.toBuffer().toString('base64'),
    backupMimeType: 'application/zip',
  };
}

async function repairSystemFiles(options = {}) {
  const { userRoot, sampleRoot } = getRecoveryPaths(options);
  const sourceCore = path.join(sampleRoot, 'systemfiles', 'runtime', 'core');
  const sourceHelpers = path.join(sampleRoot, 'systemfiles', 'runtime', 'helpers');
  const targetCore = path.join(userRoot, 'systemfiles', 'runtime', 'core');
  const targetHelpers = path.join(userRoot, 'systemfiles', 'runtime', 'helpers');

  const backupEntries = [];
  if (await pathExists(targetCore)) backupEntries.push({ path: targetCore, rootName: 'core' });
  if (await pathExists(targetHelpers)) backupEntries.push({ path: targetHelpers, rootName: 'helpers' });
  const backupDownload = backupEntries.length
    ? await createDirectoryBackupZip(backupEntries, `systemfiles-repair-backup-${Date.now()}.zip`)
    : null;

  if (await pathExists(targetCore)) {
    await fs.promises.rm(targetCore, { recursive: true, force: true });
  }
  if (await pathExists(targetHelpers)) {
    await fs.promises.rm(targetHelpers, { recursive: true, force: true });
  }

  await copyDirRecursive(sourceCore, targetCore);
  await copyDirRecursive(sourceHelpers, targetHelpers);

  return {
    success: true,
    repaired: ['core', 'helpers'],
    ...(backupDownload || {}),
  };
}

async function resetSystemFiles(options = {}) {
  const { userRoot, sampleRoot } = getRecoveryPaths(options);
  const userSystemFiles = path.join(userRoot, 'systemfiles');


  const sampleSystemFiles = path.join(sampleRoot, 'systemfiles');

  let backupDownload = null;

  try {
    if (await pathExists(userSystemFiles)) {
      backupDownload = await createDirectoryBackupZip(
        [{ path: userSystemFiles, rootName: 'systemfiles' }],
        `systemfiles-backup-${Date.now()}.zip`,
      );
    }

    await copyDirRecursive(sampleSystemFiles, userSystemFiles);

    const masterKey = crypto.randomBytes(16).toString('hex');
    const userProfileDir = path.join(userRoot, 'systemfiles', 'userprofile');
    await fs.promises.mkdir(userProfileDir, { recursive: true });
    await fs.promises.writeFile(path.join(userProfileDir, 'jsApiKey.txt'), masterKey, 'utf8');

    const appsRoot = path.join(userSystemFiles, 'runtime', 'apps');
    if (await pathExists(appsRoot)) {
      const entries = await fs.promises.readdir(appsRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const appDir = path.join(appsRoot, entry.name);
        try {
          if (await appRequestsAdminPerm(appDir)) {
            await syncAppJsKey(appDir, masterKey);
          }
        } catch (e) {
          // ignore per-app errors
        }
      }
    }

    return {
      success: true,
      ...(backupDownload || {}),
    };
  } catch (err) {
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}

async function deleteUserApp(options = {}) {
  const { appsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot;
  const { nonSystemApps } = await splitRecoveryAppDefinitions(options);
  const match = findMatchingAppDefinition(nonSystemApps, options.appIdentifier);

  if (!match) {
    return { success: false, error: 'unable to locate matching non-system app' };
  }

  const targetAppDir = path.join(targetAppsRoot, match.folderName);
  await fs.promises.rm(targetAppDir, { recursive: true, force: true });

  return {
    success: true,
    app: {
      id: match.id,
      label: match.label,
      folderName: match.folderName,
    },
  };
}

async function restoreSystemAppJsKeys(options = {}) {
  const { userRoot, appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot;
  const sourceAppsRoot = sampleAppsRoot;
  const masterKeyPath = path.join(userRoot, 'systemfiles', 'userprofile', 'jsApiKey.txt');
  const masterKey = options.masterKey || await fs.promises.readFile(masterKeyPath, 'utf8');

  const restoredApps = [];
  const definitions = await collectSystemAppDefinitions(sourceAppsRoot);

  for (const definition of definitions) {
    if (!(await appRequestsAdminPerm(definition.appDirPath))) continue;
    const targetAppDir = path.join(targetAppsRoot, definition.folderName);
    if (!(await pathExists(targetAppDir))) continue;
    await syncAppJsKey(targetAppDir, masterKey);
    restoredApps.push({ id: definition.id, label: definition.label, folderName: definition.folderName });
  }

  return { restoredCount: restoredApps.length, apps: restoredApps };
}

async function resetSystemApp(options = {}) {
  const { userRoot, appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot;
  const sourceAppsRoot = sampleAppsRoot;

  const systemApps = await getRecoveryCatalog(options);
  const match = findMatchingAppDefinition(
    systemApps.map((app) => ({ ...app, appDirPath: path.join(sourceAppsRoot, app.folderName) })),
    options.appIdentifier,
  );

  if (!match) {
    return { success: false, error: 'unable to locate matching system app' };
  }

  const targetAppDir = path.join(targetAppsRoot, match.folderName);
  const sourceAppDir = path.join(sourceAppsRoot, match.folderName);
  await fs.promises.mkdir(path.dirname(targetAppDir), { recursive: true });

  let backupDownload = null;
  if (await pathExists(targetAppDir)) {
    backupDownload = await createDirectoryBackupZip(
      [{ path: targetAppDir, rootName: match.folderName }],
      `${match.folderName}-backup-${Date.now()}.zip`,
    );
  }

  await fs.promises.rm(targetAppDir, { recursive: true, force: true });
  await copyDirRecursive(sourceAppDir, targetAppDir);

  const masterKeyPath = path.join(userRoot, 'systemfiles', 'userprofile', 'jsApiKey.txt');
  const masterKey = await fs.promises.readFile(masterKeyPath, 'utf8');
  if (await appRequestsAdminPerm(targetAppDir)) {
    await syncAppJsKey(targetAppDir, masterKey);
  }

  return {
    success: true,
    app: {
      id: match.id,
      label: match.label,
      folderName: match.folderName,
    },
    ...(backupDownload || {}),
  };
}

async function resetPathPermissions(options = {}) {
  const username = options.username;
  if (!username) return { success: false, error: 'missing username' };

  let userPaths;
  try {
    userPaths = getUserPaths(username);
  } catch (e) {
    return { success: false, error: 'invalid username' };
  }

  if (!userPaths || !(await pathExists(userPaths.authFile))) {
    return { success: false, error: 'user auth file not found' };
  }

  const raw = (await readJsonSafe(userPaths.authFile)) || {};
  raw.pathPermissions = [
    { path: '/systemfiles', perm: { read: true, write: false } },
    { path: '/systemfiles/runtime/apps', perm: { read: true, write: true } },
    { path: '/systemfiles/userprofile', perm: { read: true, write: true } },
    { path: '/systemfiles/background', perm: { read: true, write: true } },
  ];

  try {
    await fs.promises.writeFile(userPaths.authFile, JSON.stringify(raw, null, 2));
  } catch (e) {
    return { success: false, error: 'failed to write auth file' };
  }

  return { success: true };
}

function validateUsername(username) {
  return typeof username === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(username);
}

function getUserPaths(username) {
  if (!validateUsername(username)) {
    throw new Error('invalid username');
  }

  const safeUsername = String(username);
  const shard = getUserShard(safeUsername);

  const baseDir = path.resolve(__dirname, 'zmcdfiles');
  const shardDir = path.resolve(baseDir, shard);
  const userDir = path.resolve(shardDir, safeUsername);

  if (!pathInside(baseDir, shardDir) || !pathInside(shardDir, userDir)) {
    throw new Error('path escape');
  }

  const userRoot = path.join(userDir, 'root');
  const authFile = path.join(userDir, `${safeUsername}.txt`);

  return {
    safeUsername,
    shard,
    shardDir,
    userDir,
    userRoot,
    authFile,
  };
}

async function readAuthRecord(userPaths) {
  if (!userPaths || !userPaths.authFile || !(await pathExists(userPaths.authFile))) return null;
  const raw = await readJsonSafe(userPaths.authFile);
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

async function deleteAccountDirectory(userPaths) {
  if (!userPaths || !userPaths.userDir) return false;
  try {
    if (await pathExists(userPaths.userDir)) {
      await fs.promises.rm(userPaths.userDir, { recursive: true, force: true });
    }
    return true;
  } catch (e) {
    return false;
  }
}

function handleSystemRecoveryRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const requestPath = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (
    requestPath !== '/' &&
    requestPath !== '/server/systemRecovery' &&
    requestPath !== '/server/systemRecovery/'
  ) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  parseJsonBody(req).then(async (payload) => {
    const username = String(payload.username || '');
    const password = String(payload.password || '');
    const action = String(payload.action || '');

    let userPaths;

    try {
      userPaths = getUserPaths(username);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid username' }));
      return;
    }

    const authRecord = await readAuthRecord(userPaths);

    if (!authRecord || !authRecord.password || password !== authRecord.password) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'incorrect username or password' }));
      return;
    }

    const userRoot = userPaths.userRoot;
    const systemFilesRoot = path.join(userRoot, 'systemfiles');
    const appsRoot = path.join(systemFilesRoot, 'runtime', 'apps');
    const sampleRoot = path.resolve(__dirname, 'USER', 'root');
    const sampleAppsRoot = path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
    const brokenAppsRoot = path.join(systemFilesRoot, 'runtime', 'brokenApps');

    if (action === 'list') {
      const systemApps = await getRecoveryCatalog({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        brokenAppsRoot,
      });
      const nonSystemApps = await getNonSystemRecoveryCatalog({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        brokenAppsRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, systemApps, nonSystemApps }));
      return;
    }

    if (action === 'restoreSystemJsKeys') {
      const result = await restoreSystemAppJsKeys({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
      return;
    }

    if (action === 'repairSystemFiles') {
      const result = await repairSystemFiles({
        userRoot,
        sampleRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'resetSystemFiles') {
      const result = await resetSystemFiles({
        userRoot,
        sampleRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'resetSystemApp') {
      const result = await resetSystemApp({
        userRoot,
        appsRoot,
        brokenAppsRoot,
        sampleRoot,
        sampleAppsRoot,
        appIdentifier: payload.appIdentifier,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'deleteUserApp') {
      const result = await deleteUserApp({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        appIdentifier: payload.appIdentifier,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'deleteAccount') {
      const deleted = await deleteAccountDirectory(userPaths);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: deleted, deleted }));
      return;
    }

    if (action === 'resetPathPermissions') {
      const result = await resetPathPermissions({ username });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unknown recovery action' }));
  });
}

module.exports = {
  handleSystemRecoveryRequest,
};
