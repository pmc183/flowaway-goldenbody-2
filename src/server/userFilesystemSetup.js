const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USER_TEMPLATE_PATH = path.join(__dirname, "USER", "root");
const START_MENU_SOURCE_PATH = path.join(USER_TEMPLATE_PATH, "systemfiles", "userprofile", "startMenu-config.json");
const PROFILE_SOURCE_PATH = path.join(USER_TEMPLATE_PATH, "systemfiles", "userprofile", "profile.json");

function defaultSystemPathPermissions() {
  return [
    {
      path: "/systemfiles",
      perm: { read: true, write: false },
    },
    {
      path: "/systemfiles/runtime/apps",
      perm: { read: true, write: true },
    },
    {
      path: "/systemfiles/userprofile",
      perm: { read: true, write: true },
    },
    {
      path: "/systemfiles/background",
      perm: { read: true, write: true },
    },
  ];
}

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultStartMenuConfig() {
  return {
    version: "1.0",
    pinnedApps: ["Browser", "File Explorer", "Settings", "Text Editor"],
    recents: [],
    maxRecents: 5,
  };
}

function defaultDesktopShortcuts() {
  const slotPercent = (col, row) => ({
    x: ((col + 0.5) / 12) * 100,
    y: ((row + 0.5) / 6) * 100,
  });

  return [
    {
      id: "app-File Explorer",
      type: "app",
      label: "File Explorer",
      path: "/systemfiles/runtime/apps/fileExplorer",
      appId: "File Explorer",
      name: "File Explorer",
      ...slotPercent(0, 0),
      fileName: "app-File_Explorer.json",
    },
    {
      id: "app-Browser",
      type: "app",
      label: "Browser",
      path: "/systemfiles/runtime/apps/browser",
      appId: "Browser",
      name: "Browser",
      ...slotPercent(1, 0),
      fileName: "app-Browser.json",
    },
    {
      id: "app-Terminal",
      type: "app",
      label: "Terminal",
      path: "/systemfiles/runtime/apps/terminal",
      appId: "Terminal",
      name: "Terminal",
      ...slotPercent(0, 1),
      fileName: "app-Terminal.json",
    },
    {
      id: "app-Text Editor",
      type: "app",
      label: "Text Editor",
      path: "/systemfiles/runtime/apps/textEditor",
      appId: "Text Editor",
      name: "Text Editor",
      ...slotPercent(1, 1),
      fileName: "app-Text_Editor.json",
    },
    {
      id: "app-Settings",
      type: "app",
      label: "Settings",
      path: "/systemfiles/runtime/apps/settings",
      appId: "Settings",
      name: "Settings",
      ...slotPercent(0, 2),
      fileName: "app-Settings.json",
    },
    {
      id: "/systemfiles/runtime/apps",
      type: "folder",
      label: "apps",
      path: "/systemfiles/runtime/apps",
      name: "apps",
      ...slotPercent(1, 2),
      fileName: "systemfiles_runtime_apps.json",
    },
  ];
}

async function ensureDesktopShortcuts(userPaths) {
  const desktopDir = path.join(userPaths.userRoot, "desktop");
  await fs.promises.mkdir(desktopDir, { recursive: true });

  await Promise.all(
    defaultDesktopShortcuts().map(async (shortcut) => {
      const shortcutPath = path.join(desktopDir, shortcut.fileName);
      try {
        await fs.promises.writeFile(shortcutPath, JSON.stringify(shortcut, null, 2), { flag: "wx" });
      } catch (e) {
        if (e && e.code !== "EEXIST") throw e;
      }
    }),
  );
}

async function ensureStartMenuConfig(userPaths) {
  await fs.promises.mkdir(userPaths.userProfileDir, { recursive: true });

  try {
    if (!(await pathExists(userPaths.startMenuPath))) {
      if (await pathExists(START_MENU_SOURCE_PATH)) {
        try {
          await fs.promises.copyFile(START_MENU_SOURCE_PATH, userPaths.startMenuPath);
        } catch (e) {}
      } else {
        try {
          await fs.promises.writeFile(userPaths.startMenuPath, JSON.stringify(defaultStartMenuConfig(), null, 2));
        } catch (e) {}
      }
    }
  } catch (e) {}

  try {
    const profileDest = path.join(userPaths.userProfileDir, "profile.json");
    if (!(await pathExists(profileDest)) && (await pathExists(PROFILE_SOURCE_PATH))) {
      try {
        await fs.promises.copyFile(PROFILE_SOURCE_PATH, profileDest);
      } catch (e) {}
    }
  } catch (e) {}
}

async function ensureAppIntegrityKey(userPaths) {
  await fs.promises.mkdir(userPaths.userProfileDir, { recursive: true });
  const keyPath = path.join(userPaths.userProfileDir, "jsApiKey.txt");

  try {
    const existing = await fs.promises.readFile(keyPath, "utf8");
    return String(existing).trim();
  } catch (e) {
    const randomKey = crypto.randomBytes(16).toString("hex");
    await fs.promises.writeFile(keyPath, randomKey);
    return randomKey;
  }
}

async function syncAppKeysToUserKey(userPaths, userKey) {
  const resolvedKey = String(userKey || "").trim();
  if (!resolvedKey) return;

  const appsDir = path.join(userPaths.systemfilesDir, "runtime", "apps");

  let appFolders;

  try {
    appFolders = await fs.promises.readdir(appsDir, {
      withFileTypes: true,
    });
  } catch (e) {
    if (e.code === "ENOENT") return;
    throw e;
  }

  await Promise.all(
    appFolders.map(async (folder) => {
      if (!folder.isDirectory() || folder.name.startsWith(".")) return;

      const appFolderPath = path.join(appsDir, folder.name);

      const items = await fs.promises.readdir(appFolderPath, {
        withFileTypes: true,
      });

      await Promise.all(
        items.map(async (item) => {
          if (item.isFile() && item.name.toLowerCase() === "jskey.txt" && item.name !== "jsKey.txt") {
            await fs.promises.unlink(path.join(appFolderPath, item.name));
          }
        }),
      );

      await fs.promises.writeFile(path.join(appFolderPath, "jsKey.txt"), resolvedKey);
    }),
  );
}

async function copyTemplateToUser(userPaths) {
  try {
    const templateSystemFilesPath = path.join(USER_TEMPLATE_PATH, "systemfiles");
    if (!(await pathExists(templateSystemFilesPath))) return;

    const userSystemfilesPath = userPaths.systemfilesDir;
    const userAppsPath = path.join(userSystemfilesPath, "runtime", "apps");

    const copyFileSafe = async (src, dst) => {
      try {
        await fs.promises.mkdir(path.dirname(dst), { recursive: true });
        await fs.promises.copyFile(src, dst, fs.constants.COPYFILE_EXCL);
      } catch (e) {
        if (e && e.code !== "EEXIST") throw e;
      }
    };

    const copyDirSkipKeys = async (srcDir, dstDir) => {
      if (!(await pathExists(srcDir))) return;
      await fs.promises.mkdir(dstDir, { recursive: true });
      const items = await fs.promises.readdir(srcDir, { withFileTypes: true });

      await Promise.all(
        items.map(async (item) => {
          if (item.name === "userprofile") return;
          const src = path.join(srcDir, item.name);
          const dst = path.join(dstDir, item.name);

          try {
            if (item.isDirectory()) {
              await copyDirSkipKeys(src, dst);
              return;
            }

            if (item.name.toLowerCase() === "jskey.txt") return;
            await copyFileSafe(src, dst);
          } catch (e) {}
        }),
      );
    };

    await copyDirSkipKeys(templateSystemFilesPath, userSystemfilesPath);

    const templateAppsPath = path.join(templateSystemFilesPath, "runtime", "apps");
    if (await pathExists(templateAppsPath)) {
      const appEntries = await fs.promises.readdir(templateAppsPath, { withFileTypes: true });
      await Promise.all(
        appEntries.map(async (appEntry) => {
          if (!appEntry.isDirectory() || appEntry.name.startsWith(".")) return;

          const srcApp = path.join(templateAppsPath, appEntry.name);
          const dstApp = path.join(userAppsPath, appEntry.name);

          await copyDirSkipKeys(srcApp, dstApp);
        }),
      );
    }
  } catch (e) {
    console.error("copyTemplateToUser error:", e && e.message ? e.message : String(e));
  }
}

async function setupUserFilesystem(userPaths) {
  const userKeyPromise = ensureAppIntegrityKey(userPaths);

  await Promise.all([ensureStartMenuConfig(userPaths), copyTemplateToUser(userPaths), ensureDesktopShortcuts(userPaths)]);

  const userKey = await userKeyPromise;
  await syncAppKeysToUserKey(userPaths, userKey);
  return userKey;
}

module.exports = {
  defaultSystemPathPermissions,
  setupUserFilesystem,
};