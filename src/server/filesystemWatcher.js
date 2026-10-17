
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const chokidar = require('chokidar');

const DATA_ROOT = path.resolve(__dirname, 'zmcdfiles');
const MAX_WATCHERS_PER_ACCOUNT = 100;
const WATCHER_INACTIVITY_MS = 15000;
const RENAME_DEBOUNCE_MS = 300;

const activeWatcherCounts = new Map();

function validateUsername(value) {
  const username = String(value || '').trim();

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) {
    throw new Error('Invalid username');
  }

  return username;
}

function getUserRoot(username) {
  return path.join(DATA_ROOT, validateUsername(username), 'root');
}

function normalizeRelativePath(rawPath) {
  if (!rawPath) return '';

  return String(rawPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/');
}

function isInside(root, target) {
  const relative = path.relative(root, target);

  return relative === '' ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith('..' + path.sep));
}

async function isValidToken(username, token) {
  if (!token) return false;

  try {
    username = validateUsername(username);
    const authFile = path.join(DATA_ROOT, username, `${username}.txt`);
    const auth = JSON.parse(await fsp.readFile(authFile, 'utf8'));
    const tokens = Array.isArray(auth.authTokens) ? auth.authTokens : [];

    return tokens.some(entry =>
      entry &&
      typeof entry.token === 'string' &&
      entry.token === token &&
      Number(entry.expires) > Date.now()
    );
  } catch {
    return false;
  }
}

function toRelativePath(rootDir, absolutePath) {
  const relative = path.relative(rootDir, absolutePath)
    .split(path.sep).join('/');

  return relative ? '/' + relative : '/';
}

async function handleWatchConnection(ws, req) {
  let username;
  let token;
  let requestedPath;
  let recursive;

  try {
    const url = new URL(req.url, 'http://localhost');

    username = validateUsername(url.searchParams.get('username'));
    token = url.searchParams.get('token') || '';
    requestedPath = normalizeRelativePath(url.searchParams.get('path') || '');
    recursive = url.searchParams.get('recursive') === 'true';
  } catch {
    return ws.close(1008, 'invalid request');
  }

  if (!await isValidToken(username, token)) {
    return ws.close(1008, 'invalid credentials');
  }

  const currentCount = activeWatcherCounts.get(username) || 0;

  if (currentCount >= MAX_WATCHERS_PER_ACCOUNT) {
    return ws.close(1013, 'watch limit exceeded');
  }

  activeWatcherCounts.set(username, currentCount + 1);

  let watcher;
  let cleanedUp = false;
  let slotReleased = false;
  let inactivityTimer;
  let ready = false;

  const pendingUnlinks = new Map();
  const knownFiles = new Map();

  function releaseSlot() {
    if (slotReleased) return;
    slotReleased = true;

    const count = activeWatcherCounts.get(username) || 0;

    if (count <= 1) activeWatcherCounts.delete(username);
    else activeWatcherCounts.set(username, count - 1);
  }

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;

    clearTimeout(inactivityTimer);

    for (const pending of pendingUnlinks.values()) {
      clearTimeout(pending.timer);
    }

    pendingUnlinks.clear();
    releaseSlot();

    if (watcher) {
      watcher.close().catch(() => {});
    }
  }

  function armInactivityTimer() {
    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
      if (ws.readyState === 1) {
        ws.close(1000, 'client inactive');
      }
      cleanup();
    }, WATCHER_INACTIVITY_MS);
  }

  ws.on('message', () => {
    // Only client activity resets this timer.
    armInactivityTimer();
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
  armInactivityTimer();

  function sendEvent(eventName, absolutePath, extra = {}) {
    if (cleanedUp || ws.readyState !== 1) return;

    const root = getUserRoot(username);

    if (!isInside(root, absolutePath)) return;

    const payload = {
      type: 'watch',
      event: eventName,
      path: toRelativePath(root, absolutePath),
      username,
      recursive,
      ...extra,
    };

    try {
      ws.send(JSON.stringify(payload));
    } catch {
      cleanup();
    }
  }

  function identity(stats) {
    if (!stats || stats.ino == null || stats.ino === 0) return null;
    return `${stats.dev}:${stats.ino}`;
  }

  function shouldEmit(absolutePath, targetPath) {
    if (!requestedPath) return true;
    return isInside(targetPath, absolutePath);
  }

  function flushUnlink(absolutePath, targetPath) {
    const pending = pendingUnlinks.get(absolutePath);
    if (!pending) return;

    clearTimeout(pending.timer);
    pendingUnlinks.delete(absolutePath);

    if (shouldEmit(absolutePath, targetPath)) {
      sendEvent(pending.event, absolutePath);
    }
  }

  function handleAdd(eventName, filePath, stats, targetPath) {
    const absolutePath = path.resolve(filePath);

    if (!shouldEmit(absolutePath, targetPath)) return;

    const fileId = identity(stats);

    if (fileId) {
      for (const [oldPath, pending] of pendingUnlinks) {
        if (oldPath === absolutePath || pending.identity !== fileId) {
          continue;
        }

        clearTimeout(pending.timer);
        pendingUnlinks.delete(oldPath);
        knownFiles.delete(oldPath);

        if (isInside(getUserRoot(username), oldPath)) {
          sendEvent('rename', absolutePath, {
            oldPath: toRelativePath(getUserRoot(username), oldPath),
            newPath: toRelativePath(getUserRoot(username), absolutePath),
          });
        }

        knownFiles.set(absolutePath, stats);
        return;
      }
    }

    knownFiles.set(absolutePath, stats);

    // A replacement at the same path is not a rename.
    if (pendingUnlinks.has(absolutePath)) {
      flushUnlink(absolutePath, targetPath);
    }

    sendEvent(eventName, absolutePath);
  }

  function handleUnlink(eventName, filePath, targetPath) {
    const absolutePath = path.resolve(filePath);

    if (!shouldEmit(absolutePath, targetPath)) return;

    const stats = knownFiles.get(absolutePath);
    knownFiles.delete(absolutePath);

    const existing = pendingUnlinks.get(absolutePath);
    if (existing) clearTimeout(existing.timer);

    const pending = {
      event: eventName,
      identity: identity(stats),
      timer: setTimeout(
        () => flushUnlink(absolutePath, targetPath),
        RENAME_DEBOUNCE_MS
      ),
    };

    pendingUnlinks.set(absolutePath, pending);
  }

  try {
    const userRoot = getUserRoot(username);
    const allowedRoot = fs.realpathSync(userRoot);
    const targetPath = requestedPath
      ? path.resolve(userRoot, requestedPath)
      : userRoot;

    if (!isInside(userRoot, targetPath)) {
      cleanup();
      return ws.close(1008, 'invalid path');
    }

    if (requestedPath && !fs.existsSync(targetPath)) {
      cleanup();
      return ws.close(1008, 'path does not exist');
    }

    // Reject an existing target whose real path escapes the user root.
    if (fs.existsSync(targetPath)) {
      const realTarget = fs.realpathSync(targetPath);

      if (!isInside(allowedRoot, realTarget)) {
        cleanup();
        return ws.close(1008, 'path outside user root');
      }
    }

    const watchPath = fs.existsSync(targetPath)
      ? targetPath
      : fs.existsSync(path.dirname(targetPath))
        ? path.dirname(targetPath)
        : userRoot;

    watcher = chokidar.watch(watchPath, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
      depth: recursive ? undefined : 0,
    });

    watcher.on('add', (p, stats) =>
      handleAdd('add', p, stats, targetPath));

    watcher.on('addDir', (p, stats) =>
      handleAdd('addDir', p, stats, targetPath));

    watcher.on('change', (p, stats) => {
      const absolutePath = path.resolve(p);

      if (!shouldEmit(absolutePath, targetPath)) return;

      if (stats) knownFiles.set(absolutePath, stats);
      sendEvent('change', absolutePath);
    });

    watcher.on('unlink', p =>
      handleUnlink('unlink', p, targetPath));

    watcher.on('unlinkDir', p =>
      handleUnlink('unlinkDir', p, targetPath));

    watcher.on('error', error => {
      if (ws.readyState === 1) {
        sendEvent('error', targetPath, { error: "An error occurred while watching the path. Try reconnecting." });
      }
    });

    watcher.on('ready', () => {
      if (cleanedUp) return;
      ready = true;

      for (const [dir, names] of Object.entries(watcher.getWatched())) {
        for (const name of names) {
          const absolutePath = path.resolve(dir, name);

          try {
            const stats = fs.lstatSync(absolutePath);
            knownFiles.set(absolutePath, stats);
          } catch {
            // Entry may have disappeared during scanning.
          }
        }
      }

      // Signal readiness for both recursive and non-recursive watches.
      sendEvent('ready', targetPath);
    });
  } catch {
    cleanup();

    if (ws.readyState === 1) {
      ws.close(1011, 'watch initialization failed');
    }
  }
}

module.exports = {
  handleWatchConnection
};
