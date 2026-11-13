
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const DATA_DIR = path.resolve(__dirname, './zmcdfiles');
const STAGING_DIR = path.resolve(__dirname, './zmcdfiles-unsharded');

const APPLY = process.argv.includes('--apply');

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!await exists(DATA_DIR)) {
    throw new Error('zmcdfiles directory does not exist.');
  }

  await fsp.mkdir(STAGING_DIR, { recursive: true });

  const shards = await fsp.readdir(DATA_DIR, { withFileTypes: true });

  let moved = 0;
  let skipped = 0;

  for (const shard of shards) {
    if (!shard.isDirectory() || !/^[a-f0-9]{3}$/i.test(shard.name)) {
      continue;
    }

    const shardPath = path.join(DATA_DIR, shard.name);
    const users = await fsp.readdir(shardPath, { withFileTypes: true });

    for (const user of users) {
      if (!user.isDirectory() || !/^[a-zA-Z0-9_-]{3,20}$/.test(user.name)) {
        skipped++;
        continue;
      }

      const source = path.join(shardPath, user.name);
      const destination = path.join(STAGING_DIR, user.name);

      if (await exists(destination)) {
        console.error(`[CONFLICT] ${user.name}: already exists in staging.`);
        skipped++;
        continue;
      }

      console.log(`[${APPLY ? 'MOVE' : 'DRY RUN'}] ${shard.name}/${user.name}`);

      if (APPLY) {
        await fsp.rename(source, destination);
      }

      moved++;
    }
  }

  console.log('\nExtraction complete.');
  console.log(`Users ${APPLY ? 'moved' : 'to move'}: ${moved}`);
  console.log(`Skipped: ${skipped}`);

  if (!APPLY) {
    console.log('\nRun with --apply to actually move the directories.');
  }
}

main().catch(err => {
  console.error('Extraction failed:', err);
  process.exitCode = 1;
});
