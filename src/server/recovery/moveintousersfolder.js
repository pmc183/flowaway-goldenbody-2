
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fsp = fs.promises;

const DATA_DIR = path.resolve(__dirname, './zmcdfiles');
const STAGING_DIR = path.resolve(__dirname, './zmcdfiles-unsharded');

const APPLY = process.argv.includes('--apply');

function getUserShard(username) {
  return crypto
    .createHash('sha256')
    .update(String(username))
    .digest('hex')
    .slice(0, 3);
}

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!await exists(STAGING_DIR)) {
    throw new Error('Staging directory does not exist.');
  }

  const users = await fsp.readdir(STAGING_DIR, { withFileTypes: true });

  const validUsers = users.filter(user =>
    user.isDirectory() &&
    /^[a-zA-Z0-9_-]{3,20}$/.test(user.name)
  );

  const invalidUsers = users.filter(user =>
    !user.isDirectory() ||
    !/^[a-zA-Z0-9_-]{3,20}$/.test(user.name)
  );

  if (invalidUsers.length) {
    throw new Error(
      `Found ${invalidUsers.length} invalid staging entries. Nothing was changed.`
    );
  }

  if (!APPLY) {
    console.log('DRY RUN - no files will be changed.\n');

    for (const user of validUsers) {
      const shard = getUserShard(user.name);
      console.log(`[RESTORE] ${user.name} -> ${shard}/${user.name}`);
    }

    console.log(`\nUsers to restore: ${validUsers.length}`);
    console.log('\nRun with --apply to perform restoration.');
    return;
  }

  // Delete the old directory completely.
  console.log('Removing existing zmcdfiles directory...');

  await fsp.rm(DATA_DIR, {
    recursive: true,
    force: true
  });

  // Recreate an empty directory.
  await fsp.mkdir(DATA_DIR, { recursive: true });

  let moved = 0;

  for (const user of validUsers) {
    const username = user.name;
    const shard = getUserShard(username);

    const source = path.join(STAGING_DIR, username);
    const shardPath = path.join(DATA_DIR, shard);
    const destination = path.join(shardPath, username);

    await fsp.mkdir(shardPath, { recursive: true });

    console.log(`[MOVE] ${username} -> ${shard}/${username}`);

    await fsp.rename(source, destination);
    moved++;
  }

  if (moved !== validUsers.length) {
    throw new Error('Not all users were restored. Staging directory preserved.');
  }

  // Only remove staging after every user has been moved.
  await fsp.rm(STAGING_DIR, {
    recursive: true,
    force: true
  });

  console.log('\nRestoration complete.');
  console.log(`Users restored: ${moved}`);
  console.log('Removed zmcdfiles-unsharded.');
}

main().catch(err => {
  console.error('Restoration failed:', err);
  process.exitCode = 1;
});
