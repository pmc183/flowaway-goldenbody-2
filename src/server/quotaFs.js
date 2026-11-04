const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const {
  getUserUsage,
  adjustUserUsage,
  getUserQuotaBytes,
} = require('./storageQuota');

const userLocks = new Map();
const MIN_ENTRY_SIZE_BYTES = 4 * 1024;

function getEntryDiskSizeBytes(size) {
  const numeric = Number(size);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return MIN_ENTRY_SIZE_BYTES;
  }
  return numeric + MIN_ENTRY_SIZE_BYTES;
}

function withUserLock(username, fn) {
  const prev = userLocks.get(username) || Promise.resolve();
  const next = prev.then(fn, fn);

  userLocks.set(username, next.catch(() => {}));

  return next;
}

async function exists(fullPath) {
  try {
    await fsp.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

function getByteLength(value) {
  return Buffer.isBuffer(value)
    ? value.length
    : Buffer.byteLength(String(value), 'utf8');
}

async function getPathSizeBytes(target) {
  let stat;

  try {
    stat = await fsp.lstat(target);
  } catch {
    return 0;
  }

  if (stat.isFile()) {
    return getEntryDiskSizeBytes(stat.size);
  }

  if (stat.isDirectory()) {
    let total = MIN_ENTRY_SIZE_BYTES;

    const entries = await fsp.readdir(target, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(target, entry.name);
      total += await getPathSizeBytes(fullPath);
    }

    return total;
  }

  return 0;
}

function createQuotaError(message) {
  const err = new Error(message);
  err.code = 'QUOTA_EXCEEDED';
  return err;
}

async function writeFileWithQuota(
  username,
  userRoot,
  filePath,
  rawBody,
  replace
) {
  let oldSize = 0;
  let existed = false;

  try {
    const st = await fsp.stat(filePath);

    if (st.isFile()) {
      oldSize = st.size;
      existed = true;
    }
  } catch {
    oldSize = 0;
    existed = false;
  }

  // This uses the cached usage.
  // Only the first call for a user requires a full scan.
  const used = await getUserUsage(username, userRoot);
  const quota = await getUserQuotaBytes(userRoot);

  const currentSize = getEntryDiskSizeBytes(getByteLength(rawBody));
  const previousSize = getEntryDiskSizeBytes(oldSize);
  const delta = existed
    ? (replace ? currentSize - previousSize : currentSize)
    : currentSize;

  if (delta > 0 && used + delta > quota) {
    throw createQuotaError(
      'Out of storage: cannot write file'
    );
  }

  await fsp.mkdir(path.dirname(filePath), {
    recursive: true,
  });

  const loadTreeRequired = !(await exists(filePath));

  await fsp.writeFile(filePath, rawBody, {
    flag: replace ? 'w' : 'a',
  });

  // Update the cache instead of rescanning the entire user directory.
  adjustUserUsage(username, delta, userRoot);

  return { loadTreeRequired };
}

async function finalizeDownloadWithQuota(
  username,
  userRoot,
  tmpPath,
  destCandidate
) {
  const quota = await getUserQuotaBytes(userRoot);
  const currentUsage = await getUserUsage(username, userRoot);

  const pendingSize = (
    await fsp.stat(tmpPath).catch(() => ({ size: 0 }))
  ).size;

  const existingSize = await fsp.stat(destCandidate).then((stat) => {
    return stat.isFile() ? stat.size : 0;
  }).catch(() => 0);

  const delta = getEntryDiskSizeBytes(pendingSize) - getEntryDiskSizeBytes(existingSize);

  if (delta > 0 && currentUsage + delta > quota) {
    await fsp.unlink(tmpPath).catch(() => {});

    throw createQuotaError(
      'Out of storage: cannot download this file'
    );
  }

  try {
    await fsp.rename(tmpPath, destCandidate);
  } catch (e) {
    try {
      await fsp.copyFile(tmpPath, destCandidate);
      await fsp.unlink(tmpPath);
    } catch (copyErr) {
      throw copyErr;
    }
  }

  // If the destination already existed, only the net storage change should be applied.
  adjustUserUsage(username, delta, userRoot);

  return pendingSize;
}

async function createDirectoryWithQuota(
  username,
  userRoot,
  dirPath
) {
  const quota = await getUserQuotaBytes(userRoot);
  const currentUsage = await getUserUsage(username, userRoot);
  const dirSize = getEntryDiskSizeBytes(0);

  if (currentUsage + dirSize > quota) {
    throw createQuotaError(
      'Out of storage: cannot create folder'
    );
  }

  if (await exists(dirPath)) {
    return false;
  }

  await fsp.mkdir(dirPath, {
    recursive: true,
  });

  adjustUserUsage(username, dirSize, userRoot);
  return true;
}

async function deletePathWithQuota(
  username,
  userRoot,
  targetPath
) {
  // Calculate the size BEFORE deleting it.
  // This is necessary for directories because their size is not
  // necessarily known from a single stat().
  const deletedSize = await getPathSizeBytes(targetPath);

  await fsp.rm(targetPath, {
    recursive: true,
    force: true,
  });

  // Decrease cached usage instead of rescanning the entire root.
  adjustUserUsage(username, -deletedSize, userRoot);
}

async function copyPathWithQuota(
  username,
  userRoot,
  src,
  dest,
  currentUsed
) {
  const srcSize = await getPathSizeBytes(src);
  const quota = await getUserQuotaBytes(userRoot);

  if (currentUsed + srcSize > quota) {
    throw createQuotaError(
      `Out of storage: cannot paste "${path.basename(src)}"`
    );
  }

  await fsp.cp(src, dest, {
    recursive: true,
    force: false,
  });

  // Copy added srcSize bytes to the user's storage.
  adjustUserUsage(username, srcSize, userRoot);

  return currentUsed + srcSize;
}

module.exports = {
  withUserLock,
  writeFileWithQuota,
  finalizeDownloadWithQuota,
  createDirectoryWithQuota,
  deletePathWithQuota,
  copyPathWithQuota,
};