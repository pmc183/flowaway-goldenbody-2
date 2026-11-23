"use strict";

//settings global vars
window.settingsGlobals = {};
window.settingsGlobals.allSettings = [];
window.settingsGlobals.goldenbodyId = 0;

window.settingsGlobals.settingsAppStyles = document.createElement("style");
window.settingsGlobals.settingsAppStyles.textContent = `
  .settings-panel-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(90deg, #3b82f6 0%, #3b82f6 var(--slider-progress, 50%), rgba(148, 163, 184, 0.35) var(--slider-progress, 50%), rgba(148, 163, 184, 0.35) 100%);
    outline: none;
    cursor: pointer;
  }
  .settings-panel-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: #3b82f6;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }
  .settings-panel-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #3b82f6;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  }
  .settings-action-button,
  .settings-primary-button,
  .settings-secondary-button {
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
    background: rgba(148, 163, 184, 0.12);
    color: inherit;
    transition: filter 0.15s ease, transform 0.15s ease;
  }
  .settings-action-button:hover,
  .settings-primary-button:hover,
  .settings-secondary-button:hover {
    filter: brightness(1.05);
  }
  .settings-primary-button {
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(59, 130, 246, 0.4);
  }
  .settings-secondary-button {
    background: rgba(148, 163, 184, 0.12);
  }
  .settings-toggle {
    accent-color: #3b82f6;
  }
`;
document.head.appendChild(window.settingsGlobals.settingsAppStyles);

window.settingsGlobals.persistSettingsProfilePatch = function (patch) {
  return window.protectedGlobals.persistUserProfilePatch(patch || {});
};
window.settings = async function (posX = 50, posY = 50) {
  if (!window.settingsGlobals.innerhtmlcontent) {
    window.settingsGlobals.innerhtmlcontent = await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/settings/devdocs.html", { text: true, direct: true });
  }
  window.protectedGlobals.startMenu.style.display = "none";
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  let isMaximized = false;
  let _isMinimized = false;
  let root = document.createElement("div");
  root.className = "app-root app-window-root";
  Object.assign(root.style, {
    position: "fixed",
    top: posY + "px",
    left: posX + "px",
    width: "850px",
    height: "580px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
    zIndex: 1000,
  });
  root.dataset.appId = "Settings";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  window.settingsGlobals.goldenbodyId++;
  root.goldenbodyId = window.settingsGlobals.goldenbodyId;

  // --- Top bar ---
  var topBar = false;
  if (!topBar) {
    topBar = document.createElement("div");
    topBar.className = "appTopBar";
    topBar.style.display = "flex";
    topBar.style.justifyContent = "flex-end";
    topBar.style.alignItems = "center";
    topBar.style.padding = "2px";
    topBar.style.marginTop = "3px";
    topBar.style.cursor = "move";
    topBar.style.flexShrink = "0";
    topBar.style.position = "absolute";
    topBar.style.top = "6px";
    topBar.style.right = "6px";
    topBar.style.width = "auto";
    topBar.style.paddingTop = "14px"; // drag area height
    topBar.style.paddingBottom = "2px";
  }
  const dragStrip = document.createElement("div");
  dragStrip.style.height = "14px";
  dragStrip.style.flexShrink = "0";
  dragStrip.style.display = "flex";
  dragStrip.style.cursor = "move";
  dragStrip.style.width = "100%";
  dragStrip.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.prepend(dragStrip);
  const barrier = document.createElement("div");
  barrier.style.flexShrink = "0";
  barrier.style.display = "flex";
  barrier.style.height = "14px";
  barrier.style.width = "100%";
  barrier.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.prepend(barrier);

  var btnMin = document.createElement("button");
  btnMin.className = "btnMinColor";
  btnMin.title = "Minimize";
  topBar.appendChild(btnMin);

  var btnMax = document.createElement("button");
  btnMax.className = "btnMaxColor";
  btnMax.title = "Maximize/Restore";
  topBar.appendChild(btnMax);

  var btnClose = document.createElement("button");
  btnClose.title = "Close";
  btnClose.style.color = "white";
  btnClose.style.backgroundColor = "red";
  topBar.appendChild(btnClose);

  [topBar, btnMin, btnMax, btnClose].forEach((el) => {
    el.style.margin = "0 2px";
    el.style.border = "none";
    el.style.padding = "4px 6px";
    el.style.fontSize = "14px";
    el.style.cursor = "pointer";
  });
  const applyWindowControlIcon =
    window.protectedGlobals.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.protectedGlobals.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");
  topBar.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.appendChild(topBar);
  // --- Saved bounds shared correctly ---
  let savedBounds = {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };

  function maximizeWindow() {
    savedBounds = getBounds();
    root.style.left = "0";
    root.style.top = window.protectedGlobals.data.autohidetaskbar ? '0px' : window.protectedGlobals.currentAppMaximizedTop;    root.style.width = "100%";
    root.style.height = window.protectedGlobals.data.autohidetaskbar ? '100%' : `calc(100% - ${window.protectedGlobals.currentTaskbarHeight}px)`;
    root.style.borderRadius = "0px";
    isMaximized = true;
    _isMinimized = false;
    window.protectedGlobals.setWindowMaximizeIcon(btnMax, true);
  }

  function restoreWindow(useOriginalBounds = true) {
    if (useOriginalBounds && savedBounds) {
      applyBounds(savedBounds);
    }
    root.style.borderRadius = "10px";
    isMaximized = false;
    window.protectedGlobals.setWindowMaximizeIcon(btnMax, false);
  }

  function closeWindow() {
    root.remove();
    const index = window.settingsGlobals.allSettings.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) window.settingsGlobals.allSettings.splice(index, 1);
    window.protectedGlobals.removeAllEventListenersForApp("settings" + root.goldenbodyId);
    root.innerHTML = "";
    root = null;
  }

  function hideWindow() {
    if (!isMaximized) savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    root.style.display = "flex";
    _isMinimized = false;
    window.protectedGlobals.bringToFront(root);
  }

  function closeAll() {
    for (const instance of [...window.settingsGlobals.allSettings]) {
      if (instance && (instance.closeWindow)) {
        instance.closeWindow();
      }
    }
    window.settingsGlobals.allSettings = [];
  }

  function hideAll() {
    for (const instance of window.settingsGlobals.allSettings) {
      if (instance && (instance.hideWindow)) {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    window.settingsGlobals.allSettings.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of window.settingsGlobals.allSettings) {
      if (instance && (instance.showWindow)) {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    settings(50, 50);
  }

  // Minimize
  btnMin.addEventListener("click", () => {
    hideWindow();
  });

  // Maximize / Restore
  btnMax.addEventListener("click", () => {
    if (!isMaximized) {
      maximizeWindow();
    } else {
      restoreWindow(true);
    }
  });

  // Close
  btnClose.addEventListener("click", closeWindow);

  // --- Make draggable / resizable ---
  makeDraggableResizable(root, dragStrip, btnMax);

  function getBounds() {
    return {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };
  }

  function applyBounds(bounds) {
    root.style.left = bounds.left;
    root.style.top = bounds.top;
    root.style.width = bounds.width;
    root.style.height = bounds.height;
  }
  // --- Make draggable/resizable from previous snippet ---
  function makeDraggableResizable(el, topBar, btnMax) {
    let active = null;
    (function makeDraggable() {
      let dragging = false,
        startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;
      let thresholdCrossed = false;
      function getDragThreshold() {
        const v = Number(window.protectedGlobals.data.DRAG_THRESHOLD);
        if (!Number.isFinite(v)) return 15;
        return Math.max(2, Math.min(128, Math.round(v)));
      }
      let currentX, currentY;

      topBar.addEventListener("pointerdown", (ev) => {
        if (active) return;
        let DRAG_THRESHOLD = 15;
        DRAG_THRESHOLD = Number(window.protectedGlobals.data.DRAG_THRESHOLD) || DRAG_THRESHOLD;
        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener("settings" + root.goldenbodyId, "pointermove", (ev) => {
        if (!dragging) return;
        if (active) return;
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
        );
        if (!thresholdCrossed && dragDistance >= getDragThreshold()) {
          thresholdCrossed = true;
          if (isMaximized) {
            applyBounds(savedBounds);
            restoreWindow(false);
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        if (!thresholdCrossed) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("settings" + root.goldenbodyId, "pointerup", () => {
        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      });
    })();

    function resize() {
      const el = root;
      const BW = 8;
      const minW = 450,
        minH = 350;
      active = null;

      const hitTest = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX,
          y = e.clientY;
        const onL = x >= r.left && x <= r.left + BW;
        const onR = x <= r.right && x >= r.right - BW;
        const onT = y >= r.top && y <= r.top + BW;
        const onB = y <= r.bottom && y >= r.bottom - BW;
        if (onT && onL) return "nw";
        if (onT && onR) return "ne";
        if (onB && onL) return "sw";
        if (onB && onR) return "se";
        if (onL) return "w";
        if (onR) return "e";
        if (onT) return "n";
        if (onB) return "s";
        return "";
      };

      el.addEventListener("pointermove", (e) => {
        if (active) return;
        const d = hitTest(e);
        el.style.cursor = d
          ? d === "nw" || d === "se"
            ? "nwse-resize"
            : d === "ne" || d === "sw"
              ? "nesw-resize"
              : d === "n" || d === "s"
                ? "ns-resize"
                : "ew-resize"
          : "default";
      });

      el.addEventListener("pointerdown", (e) => {
        const dir = hitTest(e);
        if (!dir) return;
        active = {
          dir,
          sx: e.clientX,
          sy: e.clientY,
          sw: el.offsetWidth,
          sh: el.offsetHeight,
          sl: el.offsetLeft,
          st: el.offsetTop,
          startedMaximized: isMaximized,
          restoredFromMax: false,
        };
        document.body.style.userSelect = "none";
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        if (
          active.startedMaximized &&
          !active.restoredFromMax &&
          (Math.abs(e.clientX - active.sx) > 1 ||
            Math.abs(e.clientY - active.sy) > 1)
        ) {
          restoreWindow(false);
          active.sx = e.clientX;
          active.sy = e.clientY;
          active.sw = el.offsetWidth;
          active.sh = el.offsetHeight;
          active.sl = el.offsetLeft;
          active.st = el.offsetTop;
          active.restoredFromMax = true;
        }
        const dx = e.clientX - active.sx,
          dy = e.clientY - active.sy;
        if (active.dir.includes("e"))
          el.style.width = Math.max(minW, active.sw + dx) + "px";
        if (active.dir.includes("s"))
          el.style.height = Math.max(minH, active.sh + dy) + "px";
        if (active.dir.includes("w")) {
          el.style.width = Math.max(minW, active.sw - dx) + "px";
          el.style.left = active.sl + dx + "px";
        }
        if (active.dir.includes("n")) {
          el.style.height = Math.max(minH, active.sh - dy) + "px";
          el.style.top = Math.max(0, active.st + dy) + "px";
        }
      });

      el.addEventListener("pointerup", () => {
        active = null;
        document.body.style.userSelect = "";
        if (getBounds().width == "100%" || getBounds().height == "100%") {
        } else savedBounds = getBounds();
      });
      el.addEventListener("pointercancel", () => {
        active = null;
        document.body.style.userSelect = "";
        savedBounds = getBounds();
      });

      el.style.touchAction = "none";
    }
    resize();
    root.tabIndex = "0";
  }

  // Make mainContainer fill the root and add padding
  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "flex";
  contentWrapper.style.flex = "1";
  contentWrapper.style.padding = "12px 15px 15px 15px";
  contentWrapper.style.gap = "16px";
  contentWrapper.style.minHeight = "0";
  root.appendChild(contentWrapper);

  let mainContainer = document.createElement("div");
  mainContainer.style.flex = "1";
  mainContainer.style.minWidth = "0";
  mainContainer.style.height = "100%";
  mainContainer.style.boxSizing = "border-box";
  mainContainer.style.overflowY = "auto";

  const rightPanel = document.createElement("div");
  rightPanel.style.width = "50%";
  rightPanel.style.maxWidth = "50%";
  rightPanel.style.height = "100%";
  rightPanel.style.boxSizing = "border-box";
  rightPanel.style.overflowY = "auto";
  rightPanel.style.borderLeft = "1px solid rgba(255,255,255,0.08)";
  rightPanel.style.paddingLeft = "14px";

  contentWrapper.append(mainContainer, rightPanel);

  const title = document.createElement("div");
  title.textContent = "Account Settings";
  title.style.fontSize = "16px";
  title.style.fontWeight = "600";
  title.style.marginBottom = "12px";

  const section = document.createElement("div");
  section.style.marginBottom = "16px";

  const label = document.createElement("div");
  label.textContent = "Change Password";
  label.style.fontSize = "13px";
  label.style.marginBottom = "6px";

  const oldinput = document.createElement("input");
  oldinput.type = "password";
  oldinput.placeholder = "Old password";
  oldinput.autocomplete = "current-password";
  oldinput.style.width = "calc(100% - 10px)";
  oldinput.style.boxSizing = "border-box";
  oldinput.style.padding = "6px";

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "New password";
  input.autocomplete = "new-password";
  input.style.width = "calc(100% - 10px)";
  input.style.boxSizing = "border-box";
  input.style.padding = "6px";

  const confirm = document.createElement("input");
  confirm.type = "password";
  confirm.placeholder = "Confirm password";
  confirm.autocomplete = "new-password";
  confirm.style.width = "calc(100% - 10px)";
  confirm.style.boxSizing = "border-box";
  confirm.style.padding = "6px";
  confirm.style.marginTop = "6px";

  const button = document.createElement("button");
  button.className = "settings-primary-button";
  button.textContent = "Save Password";
  button.style.marginTop = "10px";

  const status = document.createElement("div");
  status.style.marginTop = "8px";
  status.style.fontSize = "12px";

  button.onclick = async () => {
    status.textContent = "";
    oldinput.style.borderColor = "";

    if (!oldinput.value) {
      oldinput.style.borderColor = "red";
      status.textContent = "Old password is required.";
      status.style.color = "red";
      return;
    }

    if (!input.value || !confirm.value) {
      status.textContent = "New password cannot be empty.";
      status.style.color = "red";
      return;
    }

    if (input.value !== confirm.value) {
      status.textContent = "Passwords do not match.";
      status.style.color = "red";
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const res = await window.protectedGlobals.zmcdpost({
        updatePassword: true,
        password: oldinput.value,
        newPassword: input.value,
      });

      if (res && res.error) {
        if (String(res.error).toLowerCase().includes("wrong") || String(res.error).toLowerCase().includes("old password")) {
          oldinput.style.borderColor = "red";
          status.textContent = "Wrong password.";
        } else {
          status.textContent = String(res.error);
        }
        status.style.color = "red";
      } else {
        status.textContent = "Password updated.";
        status.style.color = "green";
        oldinput.value = "";
        input.value = "";
        confirm.value = "";
      }
    } catch (e) {
      status.textContent = "Failed to update password.";
      status.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "Save Password";
  };

  section.append(
    label,
    oldinput,
    document.createElement("br"),
    input,
    document.createElement("br"),
    confirm,
    document.createElement("br"),
    button,
    status,
  );
  mainContainer.append(title, section);

  async function saveAppPermissions() {
    const appPermsPayload = window.protectedGlobals.appPerms || {};
    await window.protectedGlobals.WriteFile(
      "/systemfiles/userprofile/appPermissions.json",
      JSON.stringify(appPermsPayload, null, 2),
      { text: true },
    );
    return appPermsPayload;
  }
  window.protectedGlobals.saveAppPermissions = saveAppPermissions;
  function setAppRowSaveButtonState(saveBtn, hasChanges) {
    if (!saveBtn) return;
    saveBtn.dataset.hasPendingChanges = hasChanges ? "true" : "false";
    const dark = !!window.protectedGlobals.data.dark;
    saveBtn.disabled = !hasChanges;
    saveBtn.style.opacity = hasChanges ? "1" : "0.6";
    saveBtn.style.background = hasChanges
      ? (dark ? "rgba(100, 150, 255, 0.32)" : "rgba(100, 150, 255, 0.2)")
      : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
    saveBtn.style.color = dark ? "#fff" : "#111";
    saveBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
  }

  const appListHeader = document.createElement("div");
  appListHeader.style.display = "flex";
  appListHeader.style.justifyContent = "space-between";
  appListHeader.style.alignItems = "center";
  appListHeader.style.marginBottom = "12px";

  const appListHeaderText = document.createElement("div");
  appListHeaderText.textContent = "App Settings";
  appListHeaderText.style.fontSize = "16px";
  appListHeaderText.style.fontWeight = "700";
  appListHeaderText.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";

  appListHeader.append(appListHeaderText);

  const filesystemAccessSection = document.createElement("div");
  filesystemAccessSection.style.marginBottom = "18px";
  filesystemAccessSection.style.border = "1px solid rgba(255,255,255,0.08)";
  filesystemAccessSection.style.borderRadius = "8px";
  filesystemAccessSection.style.padding = "10px";
  filesystemAccessSection.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";

  const filesystemAccessHeader = document.createElement("div");
  filesystemAccessHeader.textContent = "Active filesystem access keys";
  filesystemAccessHeader.style.fontSize = "14px";
  filesystemAccessHeader.style.fontWeight = "700";
  filesystemAccessHeader.style.marginBottom = "8px";
  filesystemAccessHeader.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";

  const filesystemAccessList = document.createElement("div");
  filesystemAccessList.style.display = "flex";
  filesystemAccessList.style.flexDirection = "column";
  filesystemAccessList.style.gap = "8px";

  function getFilesystemAccessEntries() {
    const keys = window.protectedGlobals.__externalPickerKeys || new Map();
    window.protectedGlobals.__externalPickerKeys = keys;
    if (!(keys instanceof Map)) return [];
    return Array.from(keys.entries()).map(([key, value]) => ({
      key,
      appName: value && value.appName ? String(value.appName) : "unknown",
      kind: value && value.kind ? String(value.kind) : "unknown",
      path: value && value.path ? String(value.path) : "(unknown path)",
    }));
  }

  function renderFilesystemAccessList() {
    filesystemAccessHeader.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    appListHeaderText.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    appListDesc.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
    filesystemAccessList.innerHTML = "";
    const entries = getFilesystemAccessEntries();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.textContent = "No active filesystem access keys.";
      empty.style.fontSize = "12px";
      empty.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
      filesystemAccessList.appendChild(empty);
      return;
    }

    entries.forEach(({ key, appName, kind, path }) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "flex-start";
      row.style.justifyContent = "space-between";
      row.style.gap = "10px";
      row.style.padding = "8px 10px";
      row.style.borderRadius = "6px";
      row.style.border = "1px solid rgba(255,255,255,0.08)";
      row.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

      const info = document.createElement("div");
      info.style.minWidth = "0";
      info.style.flex = "1";
      info.style.fontSize = "11px";
      info.style.lineHeight = "1.45";
      info.style.wordBreak = "break-word";

      const title = document.createElement("div");
      title.style.fontWeight = "600";
      title.style.marginBottom = "2px";
      title.textContent = `${appName} • ${kind}`;

      const details = document.createElement("div");
      details.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
      details.textContent = `${path || "(unknown path)"}`;

      const keyText = document.createElement("div");
      keyText.style.color = window.protectedGlobals.data.dark ? "#9ec5ff" : "#1d4ed8";
      keyText.style.fontFamily = "monospace";
      keyText.style.marginTop = "2px";
      keyText.textContent = key;

      info.append(title, details, keyText);

      const revokeBtn = document.createElement("button");
      revokeBtn.textContent = "Revoke";
      revokeBtn.style.border = "none";
      revokeBtn.style.borderRadius = "6px";
      revokeBtn.style.padding = "6px 10px";
      revokeBtn.style.cursor = "pointer";
      revokeBtn.style.background = "rgba(220, 38, 38, 0.15)";
      revokeBtn.style.color = window.protectedGlobals.data.dark ? "#fca5a5" : "#b91c1c";
      revokeBtn.style.flexShrink = "0";
      revokeBtn.onclick = () => {
        const map = window.protectedGlobals.__externalPickerKeys;
        if (map instanceof Map) {
          map.delete(key);
        }
        renderFilesystemAccessList();
      };

      row.append(info, revokeBtn);
      filesystemAccessList.appendChild(row);
    });
  }

  filesystemAccessSection.append(filesystemAccessHeader, filesystemAccessList);

  const appListDesc = document.createElement("div");
  appListDesc.textContent = "Installed app folders from /systemfiles/runtime/apps.";
  appListDesc.style.fontSize = "12px";
  appListDesc.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
  appListDesc.style.marginBottom = "12px";

  const appListContainer = document.createElement("div");
  appListContainer.style.display = "flex";
  appListContainer.style.flexDirection = "column";
  appListContainer.style.gap = "8px";

  rightPanel.append(filesystemAccessSection, appListHeader, appListDesc, appListContainer);
  renderFilesystemAccessList();
  refreshAppList().catch(() => {});

  function sectionTitle(text) {
    const d = document.createElement("div");
    d.textContent = text;
    d.style.fontSize = "14px";
    d.style.fontWeight = "600";
    d.style.margin = "14px 0 6px";
    return d;
  }

  function statusLine() {
    const d = document.createElement("div");
    d.style.fontSize = "12px";
    d.style.marginTop = "6px";
    return d;
  }

  function applyAppRowTheme(row, label, iconWrapper, deleteBtn, permsToggleBtn, saveBtn, adminPermsBtn, adminPermsInfo, detailsContainer, forceQuitBtn) {
    const dark = !!window.protectedGlobals.data.dark;
    if (row) {
      row.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      row.style.background = dark ? "rgba(255,255,255,0.03)" : "#f6f6f6";
    }
    if (label) {
      label.style.color = dark ? "#fff" : "#111";
    }
    if (iconWrapper) {
      iconWrapper.style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
    }
    if (forceQuitBtn) {
      forceQuitBtn.style.background = dark ? "rgba(245, 158, 11, 0.22)" : "rgba(245, 158, 11, 0.14)";
      forceQuitBtn.style.color = dark ? "#fff" : "#111";
      forceQuitBtn.style.borderColor = dark ? "rgba(251, 191, 36, 0.45)" : "rgba(217, 119, 6, 0.3)";
    }
    if (deleteBtn) {
      deleteBtn.style.background = "#c0392b";
      deleteBtn.style.color = "white";
    }
    if (permsToggleBtn) {
      const isExpanded = permsToggleBtn.dataset.expanded === "true";
      permsToggleBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
      permsToggleBtn.style.background = isExpanded
        ? (dark ? "rgba(33, 150, 243, 0.28)" : "rgba(33, 150, 243, 0.2)")
        : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
      permsToggleBtn.style.color = dark ? "#fff" : "#111";
    }
    if (saveBtn) {
      setAppRowSaveButtonState(saveBtn, saveBtn.dataset.hasPendingChanges === "true");
    }
    if (adminPermsBtn) {
      const isExpanded = adminPermsBtn.dataset.expanded === "true";
      adminPermsBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
      adminPermsBtn.style.background = isExpanded
        ? (dark ? "rgba(33, 150, 243, 0.28)" : "rgba(33, 150, 243, 0.2)")
        : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
      adminPermsBtn.style.color = dark ? "#fff" : "#111";
    }
    if (adminPermsInfo) {
      adminPermsInfo.style.color = dark ? "#ccc" : "#555";
    }
    if (detailsContainer) {
      detailsContainer.style.background = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
    }
  }

  function syncAppRowsTheme() {
    const container = appListContainer;
    if (!container) return;
    const appItems = Array.from(container.children || []).filter((child) => child instanceof HTMLElement && child.dataset.appItem === "true");
    appItems.forEach((appWrapper) => {
      const row = appWrapper.querySelector("[data-app-row='true']");
      const label = appWrapper.querySelector("[data-app-row-label='true']");
      const iconWrapper = appWrapper.querySelector("[data-app-row-icon='true']");
      const forceQuitBtn = appWrapper.querySelector("[data-app-row-force-quit='true']");
      const deleteBtn = appWrapper.querySelector("[data-app-row-delete='true']");
      const permsToggleBtn = appWrapper.querySelector("[data-app-row-perms-toggle='true']");
      const saveBtn = appWrapper.querySelector("[data-app-row-save='true']");
      const adminPermsBtn = appWrapper.querySelector("[data-app-row-admin-toggle='true']");
      const adminPermsInfo = appWrapper.querySelector("[data-app-row-admin-info='true']");
      const detailsContainer = appWrapper.querySelector("[data-app-row-perms-container='true']") || appWrapper.querySelector("[data-app-row-admin-perms-container='true']");
      applyAppRowTheme(row, label, iconWrapper, deleteBtn, permsToggleBtn, saveBtn, adminPermsBtn, adminPermsInfo, detailsContainer, forceQuitBtn);
    });
  }

  function createAppItem(appMeta, refreshList) {
    const isInvalidPackage = !!appMeta.invalidPackage || !!appMeta.invalidApp;
    const appWrapper = document.createElement("div");
    appWrapper.dataset.appItem = "true";

    const row = document.createElement("div");
    row.dataset.appRow = "true";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "8px 10px";
    row.style.marginBottom = "8px";
    row.style.border = "1px solid rgba(255,255,255,0.08)";
    row.style.borderRadius = "8px";
    row.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.03)" : "#f6f6f6";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.minWidth = "0";

    const iconWrapper = document.createElement("div");
    iconWrapper.dataset.appRowIcon = "true";
    iconWrapper.style.width = "36px";
    iconWrapper.style.height = "36px";
    iconWrapper.style.display = "grid";
    iconWrapper.style.placeItems = "center";
    iconWrapper.style.borderRadius = "10px";
    iconWrapper.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
    iconWrapper.style.overflow = "hidden";
    iconWrapper.style.flexShrink = "0";

    const displayName = appMeta.folderName || appMeta.label || appMeta.id || "Unknown App";
    const iconTextValue = isInvalidPackage
      ? (String(displayName).charAt(0) || "!").toUpperCase()
      : (appMeta.icon || "");

    const iconMode = isInvalidPackage ? "text" : (appMeta.pngEnabled ? "img" : appMeta.iconType || "text");
    if (iconMode === "img" && appMeta.icon) {
      const img = document.createElement("img");
      img.src = appMeta.icon.startsWith("data:image/") ? appMeta.icon : `data:image/png;base64,${appMeta.icon}`;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      img.style.display = "block";
      iconWrapper.appendChild(img);
    } else {
      const text = document.createElement("div");
      text.textContent = isInvalidPackage ? iconTextValue : (appMeta.icon || "");
      text.style.fontSize = "16px";
      text.style.fontWeight = "700";
      iconWrapper.appendChild(text);
    }

    const label = document.createElement("div");
    label.dataset.appRowLabel = "true";
    label.style.whiteSpace = "nowrap";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.fontSize = "14px";
    label.style.fontWeight = "600";
    label.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    label.textContent = displayName;

    left.append(iconWrapper, label);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    const deleteBtn = document.createElement("button");
    deleteBtn.dataset.appRowDelete = "true";
    deleteBtn.textContent = isInvalidPackage ? "Delete Folder" : "Delete";
    deleteBtn.style.background = "#c0392b";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "6px 10px";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.whiteSpace = "nowrap";

    if (!isInvalidPackage) {
      const forceQuitBtn = document.createElement("button");
      forceQuitBtn.dataset.appRowForceQuit = "true";
      forceQuitBtn.textContent = "Force Quit";
      forceQuitBtn.style.background = window.protectedGlobals.data.dark ? "rgba(245, 158, 11, 0.22)" : "rgba(245, 158, 11, 0.14)";
      forceQuitBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
      forceQuitBtn.style.border = "1px solid rgba(251, 191, 36, 0.45)";
      forceQuitBtn.style.padding = "6px 10px";
      forceQuitBtn.style.borderRadius = "6px";
      forceQuitBtn.style.cursor = "pointer";
      forceQuitBtn.style.whiteSpace = "nowrap";
      forceQuitBtn.addEventListener("click", async () => {
        const result = await window.protectedGlobals.showConfirmDialog("Force Quit App", "Are you sure you want to force quit this app? This will terminate the all app processes and it may lose unsaved data.");
        if (!result) return;
        window.protectedGlobals.forceStopApp(appMeta);
      });
      applyAppRowTheme(row, label, iconWrapper, deleteBtn, null, null, null, null, null, forceQuitBtn);
      right.append(forceQuitBtn);
    } else {
      applyAppRowTheme(row, label, iconWrapper, deleteBtn, null, null, null, null, null, null);
    }

    deleteBtn.addEventListener("click", async () => {
      const targetFolder = appMeta.folderName || "";
      const deleteMessage = isInvalidPackage
        ? `This folder is not a valid installed app package. Deleting it will remove the folder from /systemfiles/runtime/apps.`
        : "This will delete this app and all the data it wrote in it's own folder. (Note: If you accidentally deleted a system app you can recover it in the login page in the Reset System App section)";
      const userConfirm = await window.protectedGlobals.showConfirmDialog(isInvalidPackage ? "Delete App Folder" : "Delete App", deleteMessage);
      if (!userConfirm) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting...";
      try {
        if (isInvalidPackage) {
          await window.protectedGlobals.DeleteFolder(`/systemfiles/runtime/apps/${targetFolder}`);
        } else {
          await window.protectedGlobals.deleteApp(appMeta);
        }
        await refreshAppList();
      } catch (err) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = isInvalidPackage ? "Delete Folder" : "Delete";
        alert(`Failed to delete app folder: ${err.message || err}`);
      }
    });

    right.append(deleteBtn);
    row.append(left, right);
    appWrapper.appendChild(row);

    if (isInvalidPackage) {
      const detailsContainer = document.createElement("div");
      detailsContainer.dataset.appRowPermsContainer = "true";
      detailsContainer.style.display = "none";
      detailsContainer.style.padding = "0 10px 8px 46px";
      detailsContainer.style.fontSize = "12px";
      detailsContainer.style.gap = "8px";
      detailsContainer.style.flexDirection = "column";

      const detailsText = document.createElement("div");
      detailsText.textContent = "This app is not installed because its package is invalid or incomplete. The folder exists in /systemfiles/runtime/apps, but it did not pass the app validation checks required to register it as a usable application.";
      detailsText.style.lineHeight = "1.5";

      const folderText = document.createElement("div");
      folderText.textContent = `Folder: ${appMeta.path || `/systemfiles/runtime/apps/${appMeta.folderName || "unknown"}`}`;
      folderText.style.opacity = "0.8";
      folderText.style.wordBreak = "break-word";

      detailsContainer.append(detailsText, folderText);

      const detailsBtn = document.createElement("button");
      detailsBtn.dataset.appRowPermsToggle = "true";
      detailsBtn.textContent = "Details";
      detailsBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      detailsBtn.style.borderRadius = "4px";
      detailsBtn.style.padding = "3px 8px";
      detailsBtn.style.fontSize = "11px";
      detailsBtn.style.cursor = "pointer";
      detailsBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      detailsBtn.style.color = "inherit";

      detailsBtn.addEventListener("click", () => {
        const isVisible = detailsContainer.style.display !== "none";
        detailsContainer.style.display = isVisible ? "none" : "flex";
        detailsBtn.dataset.expanded = String(!isVisible);
        if (!isVisible) {
          setTimeout(() => {
            appWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
        applyAppRowTheme(row, label, iconWrapper, deleteBtn, null, null, null, null, detailsContainer, null);
      });

      right.appendChild(detailsBtn);
      appWrapper.appendChild(detailsContainer);
    } else if (appMeta.requestAdminPerm) {
      const adminPermsContainer = document.createElement("div");
      adminPermsContainer.dataset.appRowAdminPermsContainer = "true";
      adminPermsContainer.style.display = "none";
      adminPermsContainer.style.padding = "0 10px 8px 46px";
      adminPermsContainer.style.fontSize = "12px";
      adminPermsContainer.style.flexDirection = "column";

      const adminPermsInfo = document.createElement("div");
      adminPermsInfo.dataset.appRowAdminInfo = "true";
      adminPermsInfo.textContent = "This app has admin permission. It can do everything you can because it is a system app or you granted it a key during installation.";
      adminPermsInfo.style.lineHeight = "1.4";
      adminPermsContainer.appendChild(adminPermsInfo);

      const adminPermsBtn = document.createElement("button");
      adminPermsBtn.dataset.appRowAdminToggle = "true";
      adminPermsBtn.textContent = "Permissions";
      adminPermsBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      adminPermsBtn.style.borderRadius = "4px";
      adminPermsBtn.style.padding = "3px 8px";
      adminPermsBtn.style.fontSize = "11px";
      adminPermsBtn.style.cursor = "pointer";
      adminPermsBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      adminPermsBtn.style.color = "inherit";

      adminPermsBtn.addEventListener("click", () => {
        const isVisible = adminPermsContainer.style.display !== "none";
        adminPermsContainer.style.display = isVisible ? "none" : "flex";
        adminPermsBtn.dataset.expanded = String(!isVisible);
        applyAppRowTheme(row, label, iconWrapper, deleteBtn, null, null, adminPermsBtn, adminPermsInfo, adminPermsContainer);
      });

      right.appendChild(adminPermsBtn);
      appWrapper.appendChild(adminPermsContainer);
    } else {
      const permsContainer = document.createElement("div");
      permsContainer.dataset.appRowPermsContainer = "true";
      permsContainer.style.display = "none";
      permsContainer.style.padding = "0 10px 8px 46px";
      permsContainer.style.fontSize = "12px";
      permsContainer.style.gap = "8px";
      permsContainer.style.flexDirection = "column";

      const existingPerms = window.protectedGlobals?.appPerms[appMeta.id] || {};
      const pendingPerms = { ...existingPerms };
      const permsList = ["storage", "notification", "launchApp"];
      const permToggles = {};
      permsList.forEach(perm => {
        const permRow = document.createElement("div");
        permRow.style.display = "flex";
        permRow.style.alignItems = "center";
        permRow.style.gap = "8px";
        permRow.style.justifyContent = "space-between";

        const permLabel = document.createElement("div");
        permLabel.textContent = perm.charAt(0).toUpperCase() + perm.slice(1);
        permLabel.style.flex = "1";

        const cycleBtn = document.createElement("button");
        cycleBtn.style.border = "1px solid rgba(255,255,255,0.2)";
        cycleBtn.style.borderRadius = "4px";
        cycleBtn.style.padding = "3px 8px";
        cycleBtn.style.fontSize = "11px";
        cycleBtn.style.cursor = "pointer";
        cycleBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
        cycleBtn.style.color = "inherit";
        cycleBtn.style.whiteSpace = "nowrap";

        const currentPerm = pendingPerms[perm] || "ask";
        let state = currentPerm || "ask";
        permToggles[perm] = { btn: cycleBtn, state: state };

        const updateBtnText = () => {
          cycleBtn.textContent = state === "ask" ? "Ask" : state === "true" ? "Allow" : "Deny";
          cycleBtn.style.background = state === "ask"
            ? (window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)")
            : state === "true"
              ? "rgba(76, 175, 80, 0.3)"
              : "rgba(244, 67, 54, 0.3)";
        };
        updateBtnText();

        cycleBtn.addEventListener("click", () => {
          state = state === "ask" ? "true" : state === "true" ? "false" : "ask";
          permToggles[perm].state = state;
          pendingPerms[perm] = state;
          updateBtnText();
          setAppRowSaveButtonState(appSaveBtn, true);
        });

        permRow.append(permLabel, cycleBtn);
        permsContainer.appendChild(permRow);
      });

      const appSaveBtn = document.createElement("button");
      appSaveBtn.dataset.appRowSave = "true";
      appSaveBtn.textContent = "Save";
      appSaveBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      appSaveBtn.style.borderRadius = "4px";
      appSaveBtn.style.padding = "3px 8px";
      appSaveBtn.style.fontSize = "11px";
      appSaveBtn.style.cursor = "pointer";
      appSaveBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      appSaveBtn.style.color = "inherit";
      appSaveBtn.style.alignSelf = "flex-start";
      appSaveBtn.style.marginTop = "4px";
      setAppRowSaveButtonState(appSaveBtn, false);

      appSaveBtn.addEventListener("click", async () => {
        const originalText = appSaveBtn.textContent;
        appSaveBtn.textContent = "Saving...";
        appSaveBtn.disabled = true;
        try {
          window.protectedGlobals.appPerms = window.protectedGlobals.appPerms || {};
          window.protectedGlobals.appPerms[appMeta.id] = { ...pendingPerms };
          await saveAppPermissions();
          appSaveBtn.textContent = "Saved!";
          setAppRowSaveButtonState(appSaveBtn, false);
          setTimeout(() => {
              appSaveBtn.textContent = originalText;
          }, 2000);
        } catch (err) {
          appSaveBtn.textContent = originalText;
          setAppRowSaveButtonState(appSaveBtn, true);
          alert(`Failed to save permissions for ${appMeta.label}: ${err.message || err}`);
        }
      });

      const togglePermsBtn = document.createElement("button");
      togglePermsBtn.dataset.appRowPermsToggle = "true";
      togglePermsBtn.textContent = "Permissions";
      togglePermsBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      togglePermsBtn.style.borderRadius = "4px";
      togglePermsBtn.style.padding = "3px 8px";
      togglePermsBtn.style.fontSize = "11px";
      togglePermsBtn.style.cursor = "pointer";
      togglePermsBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      togglePermsBtn.style.color = "inherit";

      togglePermsBtn.addEventListener("click", () => {
        const isVisible = permsContainer.style.display !== "none";
        permsContainer.style.display = isVisible ? "none" : "flex";
        togglePermsBtn.dataset.expanded = String(!isVisible);
        // scroll to the bottom of the appWrapper to ensure the permissions are visible
        if (!isVisible) {
          setTimeout(() => {
            appWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
        applyAppRowTheme(row, label, iconWrapper, deleteBtn, togglePermsBtn, appSaveBtn, null, null, permsContainer);
      });

      permsContainer.appendChild(appSaveBtn);
      right.appendChild(togglePermsBtn);
      appWrapper.appendChild(permsContainer);
    }

    return appWrapper;
  }

  root.addEventListener("styleapplied", () => {
    syncAppRowsTheme();
    renderFilesystemAccessList();
  });

  async function refreshAppList() {
    if (!appListContainer) return;
    renderFilesystemAccessList();
    const container = appListContainer;
    container.innerHTML = "";
    const loading = document.createElement("div");
    loading.textContent = "Loading apps...";
    loading.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
    container.appendChild(loading);
    try {
      const installedApps = Array.isArray(window.protectedGlobals.apps) ? [...window.protectedGlobals.apps] : [];
      const installedNames = new Set(
        installedApps
          .map((app) => String(app.folderName || app.id || ""))
          .filter(Boolean),
      );

      const folderEntries = await window.protectedGlobals.ReadFolder("/systemfiles/runtime/apps", { detail: true }).catch(() => []);
      const invalidAppFolders = [];
      for (const entry of folderEntries) {
        const folderName = String((entry && entry.path) || "").split("/").pop();
        if (!folderName || entry.type !== "folder") continue;
        if (!installedNames.has(folderName)) {
          invalidAppFolders.push({
            folderName,
            path: `/systemfiles/runtime/apps/${folderName}`,
            invalidPackage: true,
            requestAdminPerm: false,
          });
        }
      }

      const appList = [...installedApps, ...invalidAppFolders].sort((a, b) => {
        const left = String(a.folderName || a.label || a.id || "").toLowerCase();
        const right = String(b.folderName || b.label || b.id || "").toLowerCase();
        return left.localeCompare(right);
      });

      container.innerHTML = "";
      if (!appList.length) {
        const empty = document.createElement("div");
        empty.textContent = "No installed apps found.";
        empty.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
        container.appendChild(empty);
        return;
      }
      for (const appMeta of appList) {
        container.appendChild(createAppItem(appMeta, refreshAppList));
      }
    } catch (e) {
      container.innerHTML = "";
      const error = document.createElement("div");
      error.textContent = `Unable to load apps: ${e.message || e}`;
      error.style.color = "red";
      container.appendChild(error);
    }
  }

  /* ========================================================="}
     🌞 DISPLAY — BRIGHTNESS
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Display"));

  const brightLabel = document.createElement("div");
  brightLabel.textContent = "Brightness";

  const brightness = document.createElement("input");
  brightness.type = "range";
  brightness.className = "settings-panel-slider";
  brightness.min = 0;
  brightness.style.width = "calc(100% - 10px)";

  const syncBrightnessSlider = () => {
    const max = !!window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100;
    const current = Number(window.protectedGlobals.statusData.brightness) || 0;
    const clamped = Math.min(max, Math.max(0, current));
    brightness.max = max;
    brightness.value = clamped;
    window.protectedGlobals.statusData.brightness = clamped;
    document.documentElement.style.filter = `brightness(${clamped}%)`;
  };

  brightness.oninput = async () => {
    const nextValue = Math.min(!!window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100, Math.max(0, Number(brightness.value) || 0));
    document.documentElement.style.filter = `brightness(${nextValue}%)`;
    window.protectedGlobals.statusData.brightness = nextValue;
    brightness.value = nextValue;
    window.dispatchEvent(new CustomEvent("brightness-state-updated", {
      detail: {
        batterySaverEnabled: !!window.protectedGlobals.statusData.batterySaverEnabled,
        brightness: nextValue,
      },
    }));
    await window.settingsGlobals.persistSettingsProfilePatch({ brightness: Number(nextValue) });
  };

  window.addEventListener("brightness-state-updated", syncBrightnessSlider);
  window.addEventListener("styleapplied", syncBrightnessSlider);
  syncBrightnessSlider();

  mainContainer.append(brightLabel, brightness);
  /* =========================================================
   🌗 APPEARANCE — THEME
========================================================= */

  mainContainer.appendChild(sectionTitle("Appearance"));

  const themeRow = document.createElement("div");
  themeRow.style.alignItems = "center";
  themeRow.style.marginTop = "8px";

  const themeLabel = document.createElement("div");
  themeLabel.textContent = "Dark Mode";
  themeLabel.style.fontSize = "13px";

  const themeToggle = document.createElement("input");
  themeToggle.type = "checkbox";
  themeToggle.className = "settings-toggle";
  themeToggle.checked = !!window.protectedGlobals.data.dark;

  /* Toggle handler */
  themeToggle.onchange = async () => {
    window.protectedGlobals.data.dark = themeToggle.checked;

    // Apply theme immediately
    window.protectedGlobals.applyStyles();

    // Persist to backend (optional but recommended)
    await window.settingsGlobals.persistSettingsProfilePatch({ dark: !!window.protectedGlobals.data.dark });
  };

  themeRow.append(themeLabel, themeToggle);
  mainContainer.appendChild(themeRow);
  const backgroundLabel = document.createElement("div");
  backgroundLabel.textContent = "Background";
  backgroundLabel.style.fontSize = "13px";
  backgroundLabel.style.marginTop = "8px";
  mainContainer.appendChild(backgroundLabel);
  const backgroundActionsRow = document.createElement("div");
  backgroundActionsRow.style.display = "flex";
  backgroundActionsRow.style.flexWrap = "wrap";
  backgroundActionsRow.style.gap = "8px";
  backgroundActionsRow.style.marginTop = "8px";
  const changeBackgroundBtn = document.createElement("button");
  changeBackgroundBtn.className = "settings-action-button";
  changeBackgroundBtn.textContent = "Change Background";
  changeBackgroundBtn.style.padding = "6px 10px";
  changeBackgroundBtn.style.borderRadius = "6px";
  changeBackgroundBtn.style.border = "1px solid rgba(255,255,255,0.16)";
  changeBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
  changeBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  changeBackgroundBtn.style.cursor = "pointer";
  changeBackgroundBtn.onclick = async () => {
    await window.protectedGlobals.changeBackground();
  };

  const resetBackgroundBtn = document.createElement("button");
  resetBackgroundBtn.className = "settings-action-button";
  resetBackgroundBtn.textContent = "Reset Background";
  resetBackgroundBtn.style.padding = "6px 10px";
  resetBackgroundBtn.style.borderRadius = "6px";
  resetBackgroundBtn.style.border = "1px solid rgba(255,255,255,0.16)";
  resetBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
  resetBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  resetBackgroundBtn.style.cursor = "pointer";
  resetBackgroundBtn.onclick = async () => {
    await window.protectedGlobals.resetBackground();
  };
  root.addEventListener("styleapplied", () => {
    changeBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
    changeBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    resetBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
    resetBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  });
  backgroundActionsRow.append(changeBackgroundBtn, resetBackgroundBtn);
  mainContainer.appendChild(backgroundActionsRow);
  mainContainer.appendChild(document.createElement("hr"));

  window.protectedGlobals.data.taskbarRevealEdgePx = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    ? Math.max(1, Math.min(64, Math.round(Number(window.protectedGlobals.data.taskbarRevealEdgePx))))
    : 6;
  window.protectedGlobals.data.taskbarRevealHoldDelayMs = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    ? Math.max(0, Math.min(5000, Math.round(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))))
    : 450;

  const autohideRow = document.createElement("div");
  autohideRow.style.alignItems = "center";
  autohideRow.style.marginTop = "8px";

  const taskbarRevealEdgeLabel = document.createElement("div");
  taskbarRevealEdgeLabel.textContent = "Taskbar Reveal Edge (px)";

  const taskbarRevealEdge = document.createElement("input");
  taskbarRevealEdge.type = "number";
  taskbarRevealEdge.min = "1";
  taskbarRevealEdge.max = "64";
  taskbarRevealEdge.step = "1";
  taskbarRevealEdge.value = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    ? String(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    : "6";
  taskbarRevealEdge.style.width = "calc(100% - 10px)";

  taskbarRevealEdge.onchange = async () => {
    const normalized = Math.max(1, Math.min(64, Math.round(Number(taskbarRevealEdge.value) || 6)));
    taskbarRevealEdge.value = String(normalized);
    window.protectedGlobals.data.taskbarRevealEdgePx = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: normalized,
      taskbarRevealHoldDelayMs: Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs),
    });
    window.protectedGlobals.applyTaskbarAutohideSettings({
      autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
      taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
    });
  };

  const taskbarRevealHoldLabel = document.createElement("div");
  taskbarRevealHoldLabel.textContent = "Taskbar Reveal Hold Delay (ms)";

  const taskbarRevealHold = document.createElement("input");
  taskbarRevealHold.type = "number";
  taskbarRevealHold.min = "0";
  taskbarRevealHold.max = "5000";
  taskbarRevealHold.step = "50";
  taskbarRevealHold.value = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    ? String(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    : "450";
  taskbarRevealHold.style.width = "calc(100% - 10px)";

  taskbarRevealHold.onchange = async () => {
    const normalized = Math.max(0, Math.min(5000, Math.round(Number(taskbarRevealHold.value) || 450)));
    taskbarRevealHold.value = String(normalized);
    window.protectedGlobals.data.taskbarRevealHoldDelayMs = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: Number(window.protectedGlobals.data.taskbarRevealEdgePx),
      taskbarRevealHoldDelayMs: normalized,
    });
    window.protectedGlobals.applyTaskbarAutohideSettings({
      autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
      taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
    });
  };

  mainContainer.append(
    taskbarRevealEdgeLabel,
    taskbarRevealEdge,
    taskbarRevealHoldLabel,
    taskbarRevealHold,
  );

  mainContainer.appendChild(sectionTitle("Windowing"));

  const dragThresholdLabel = document.createElement("div");
  dragThresholdLabel.textContent = "Window Drag Threshold (px)";

  const dragThresholdInput = document.createElement("input");
  dragThresholdInput.type = "number";
  dragThresholdInput.min = "2";
  dragThresholdInput.max = "128";
  dragThresholdInput.step = "1";
  dragThresholdInput.value = Number.isFinite(Number(window.protectedGlobals.data.DRAG_THRESHOLD))
    ? String(Number(window.protectedGlobals.data.DRAG_THRESHOLD))
    : "15";
  dragThresholdInput.style.width = "calc(100% - 10px)";

  dragThresholdInput.onchange = async () => {
    const normalized = Math.max(2, Math.min(128, Math.round(Number(dragThresholdInput.value) || 15)));
    dragThresholdInput.value = String(normalized);
    window.protectedGlobals.data.DRAG_THRESHOLD = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({ DRAG_THRESHOLD: normalized });
  };

  mainContainer.append(dragThresholdLabel, dragThresholdInput);

  mainContainer.appendChild(sectionTitle("Misc"));

  const autoupdateRow = document.createElement("div");
  autoupdateRow.style.alignItems = "center";
  autoupdateRow.style.marginTop = "8px";

  const autoupdateLabel = document.createElement("div");
  autoupdateLabel.textContent = "Auto-Update System/System Apps";
  autoupdateLabel.style.fontSize = "13px";

  const autoupdateToggle = document.createElement("input");
  autoupdateToggle.type = "checkbox";
  autoupdateToggle.checked = !!window.protectedGlobals.data.autoupdate;

  autoupdateToggle.onchange = async () => {
    window.protectedGlobals.data.autoupdate = autoupdateToggle.checked;
    await window.settingsGlobals.persistSettingsProfilePatch({ autoupdate: !!window.protectedGlobals.data.autoupdate });
  };

  autoupdateRow.append(autoupdateLabel, autoupdateToggle);
  mainContainer.appendChild(autoupdateRow);

  const disableNotificationsRow = document.createElement("div");
  disableNotificationsRow.style.alignItems = "center";
  disableNotificationsRow.style.marginTop = "8px";

  const disableNotificationsLabel = document.createElement("div");
  disableNotificationsLabel.textContent = "Disable Non-System Notifications";
  disableNotificationsLabel.style.fontSize = "13px";

  const disableNotificationsToggle = document.createElement("input");
  disableNotificationsToggle.type = "checkbox";
  disableNotificationsToggle.checked = !!window.protectedGlobals.data.disableNotifications;

  disableNotificationsToggle.onchange = async () => {
    window.protectedGlobals.data.disableNotifications = disableNotificationsToggle.checked;
    await window.settingsGlobals.persistSettingsProfilePatch({ disableNotifications: !!window.protectedGlobals.data.disableNotifications });
  };

  disableNotificationsRow.append(disableNotificationsLabel, disableNotificationsToggle);
  mainContainer.appendChild(disableNotificationsRow);
  /* =========================================================
     🗑️ DANGER ZONE — DELETE ACCOUNT
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Danger Zone"));

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete Account";
  deleteBtn.style.background = "#c0392b";
  deleteBtn.style.color = "white";

  const deleteStatus = statusLine();

  deleteBtn.onclick = async () => {
    const existingDialog = document.getElementById("settings-delete-account-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-delete-account-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "420px",
      maxWidth: "90vw",
      background: window.protectedGlobals.data.dark ? "#222" : "#fff",
      color: window.protectedGlobals.data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      zIndex: 100002,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      padding: "12px",
    });

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";

    const htitle = document.createElement("div");
    htitle.textContent = "Delete Account";
    htitle.style.fontWeight = "600";

    const closeX = document.createElement("button");
    closeX.setAttribute("aria-label", "Close dialog");
    closeX.textContent = "✕";
    Object.assign(closeX.style, {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      width: "32px",
      height: "28px",
      padding: "0",
    });
    closeX.onclick = () => dlg.remove();

    header.append(htitle, closeX);
    dlg.appendChild(header);

    const content = document.createElement("div");
    Object.assign(content.style, {
      flex: "1",
      padding: "12px 0",
      overflow: "auto",
      fontSize: "13px",
    });

    const warning = document.createElement("div");
    warning.style.color = "#c0392b";
    warning.style.marginBottom = "12px";
    warning.textContent = "⚠️ WARNING: This will permanently delete your account and ALL data. This cannot be undone.";

    const passwordLabel = document.createElement("div");
    passwordLabel.style.marginTop = "12px";
    passwordLabel.style.marginBottom = "4px";
    passwordLabel.textContent = "Enter your password to confirm:";
    passwordLabel.style.fontWeight = "500";

    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Password";
    passwordInput.style.width = "100%";
    passwordInput.style.padding = "6px";
    passwordInput.style.boxSizing = "border-box";
    passwordInput.style.borderRadius = "4px";
    passwordInput.style.border = "1px solid #ccc";
    passwordInput.style.marginBottom = "12px";

    const errorMsg = document.createElement("div");
    errorMsg.style.color = "red";
    errorMsg.style.fontSize = "12px";
    errorMsg.style.marginBottom = "12px";
    errorMsg.style.display = "none";

    content.append(warning, passwordLabel, passwordInput, errorMsg);
    dlg.appendChild(content);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "8px";
    footer.style.justifyContent = "flex-end";
    footer.style.flexShrink = "0";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "6px 12px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      background: window.protectedGlobals.data.dark ? "#333" : "#f0f0f0",
      color: "inherit",
      cursor: "pointer",
    });
    cancelBtn.onclick = () => dlg.remove();

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Delete Account";
    Object.assign(confirmBtn.style, {
      padding: "6px 12px",
      border: "none",
      borderRadius: "4px",
      background: "#c0392b",
      color: "white",
      cursor: "pointer",
    });

    confirmBtn.onclick = async () => {
      if (!passwordInput.value) {
        errorMsg.textContent = "Password is required.";
        errorMsg.style.display = "block";
        return;
      }

      confirmBtn.disabled = true;
      errorMsg.style.display = "none";

      try {
        const result = await window.protectedGlobals.zmcdpost({
          deleteAcc: true,
          password: passwordInput.value,
          username: window.protectedGlobals.getCurrentUsernameForRequests(),
        });

        if (result && result.success) {
          deleteStatus.textContent = "Account deleted successfully. Redirecting to login...";
          deleteStatus.style.color = "green";
          dlg.remove();
          setTimeout(() => {
            window.protectedGlobals.rebuildhandler();
          }, 2000);
        } else {
          const errorText = result && result.error ? String(result.error) : "Failed to delete account.";
          errorMsg.textContent = errorText;
          errorMsg.style.display = "block";
          confirmBtn.disabled = false;
          deleteStatus.textContent = errorText;
          deleteStatus.style.color = "red";
        }
      } catch (e) {
        errorMsg.textContent = "Error: " + (e.message || "Failed to request account deletion.");
        errorMsg.style.display = "block";
        confirmBtn.disabled = false;
        deleteStatus.textContent = "Error: " + (e.message || "Failed to request account deletion.");
        deleteStatus.style.color = "red";
      }
    };

    footer.append(cancelBtn, confirmBtn);
    dlg.appendChild(footer);

    document.body.appendChild(dlg);
    passwordInput.focus();
  };

  mainContainer.append(deleteBtn, deleteStatus);
  // === About section + draggable dialog ===
  mainContainer.appendChild(sectionTitle("About"));

  const aboutRow = document.createElement("div");
  aboutRow.style.display = "flex";
  aboutRow.style.flexDirection = "column";
  aboutRow.style.alignItems = "flex-start";
  aboutRow.style.gap = "8px";
  aboutRow.style.marginTop = "8px";

  const aboutText = document.createElement("div");
  aboutText.textContent = "About Flowaway Goldenbody " + window.protectedGlobals.osVersion;
  aboutText.style.fontSize = "13px";

  const aboutButtonsRow = document.createElement("div");
  aboutButtonsRow.style.display = "flex";
  aboutButtonsRow.style.flexWrap = "wrap";
  aboutButtonsRow.style.gap = "8px";
  aboutButtonsRow.style.alignItems = "center";

  const aboutBtn = document.createElement("button");
  aboutBtn.textContent = "Developer Docs";
  aboutBtn.className = "settings-action-button";

  const userGuideBtn = document.createElement("button");
  userGuideBtn.textContent = "User Guide";
  userGuideBtn.className = "settings-action-button";

  aboutButtonsRow.append(aboutBtn, userGuideBtn);
  aboutRow.append(aboutText, aboutButtonsRow);
  mainContainer.appendChild(aboutRow);

  function showAboutDialog() {
    // If already exists, bring to front
    const existing = document.getElementById("settings-about-dialog");
    if (existing) {
      existing.style.display = "flex";
      return;
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-about-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "calc(50% - 300px)",
      top: "calc(50% - 90px)",
      width: "50vw",
      height: "50vh",
      minHeight: "180px",
      minWidth: "420px",
      background: window.protectedGlobals.data.dark ? "#222" : "#fff",
      color: window.protectedGlobals.data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 3000,
      resize: "both",
    });
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "flex-start";
    header.style.padding = "8px 10px";
    header.style.cursor = "move";
    header.style.background = window.protectedGlobals.data.dark ? "#111" : "#f1f1f1";
    header.style.flexShrink = "0";
    header.style.position = "relative";
    const htitle = document.createElement("div");
    htitle.textContent = "About";
    htitle.style.fontWeight = "600";

    const closeX = document.createElement("button");
    closeX.setAttribute("aria-label", "Close dialog");
    closeX.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 6L18 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M18 6L6 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    `;
    Object.assign(closeX.style, {
      border: "none",
      background: "red",
      cursor: "pointer",
      width: "35px",
      height: "23px",
      padding: "0",
      display: "grid",
      placeItems: "center",
      lineHeight: "0",
    });

    header.append(htitle);
    dlg.appendChild(header);

    // position the close button in the top-right corner of the dialog
    Object.assign(closeX.style, {
      position: "absolute",
      right: "8px",
      top: "8px",
    });
    dlg.appendChild(closeX);

    const content = document.createElement("div");
    content.style.padding = "12px";
    content.style.fontSize = "13px";
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.innerHTML = window.settingsGlobals.innerhtmlcontent;
    dlg.appendChild(content);

    document.body.appendChild(dlg);

    // Close handler
    closeX.addEventListener("click", () => dlg.remove());

    // Make dialog draggable using pointer events on header
    (function makeDraggableDialog() {
      let dragging = false;
      let startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;

      header.addEventListener("pointerdown", (ev) => {
        dragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = dlg.offsetLeft;
        origTop = dlg.offsetTop;
        header.setPointerCapture(ev.pointerId);
        document.body.style.userSelect = "none";
      });

      window.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        dlg.style.left = origLeft + dx + "px";
        dlg.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("pointerup", (ev) => {
        if (!dragging) return;
        dragging = false;
        try {
          header.releasePointerCapture(ev.pointerId);
        } catch (e) {}
        document.body.style.userSelect = "";
      });
    })();
  }

  function showUserGuideDialog() {
    const existing = document.getElementById("settings-user-guide-dialog");
    if (existing) {
      existing.style.display = "flex";
      return;
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-user-guide-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "calc(50% - 300px)",
      top: "calc(50% - 90px)",
      width: "50vw",
      height: "60vh",
      minHeight: "220px",
      minWidth: "420px",
      background: window.protectedGlobals.data.dark ? "#222" : "#fff",
      color: window.protectedGlobals.data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 3000,
      resize: "both",
    });

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "flex-start";
    header.style.padding = "8px 10px";
    header.style.cursor = "move";
    header.style.background = window.protectedGlobals.data.dark ? "#111" : "#f1f1f1";
    header.style.flexShrink = "0";
    header.style.position = "relative";

    const htitle = document.createElement("div");
    htitle.textContent = "User Guide";
    htitle.style.fontWeight = "600";

    const closeX = document.createElement("button");
    closeX.setAttribute("aria-label", "Close dialog");
    closeX.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 6L18 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M18 6L6 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    `;
    Object.assign(closeX.style, {
      border: "none",
      background: "red",
      cursor: "pointer",
      width: "35px",
      height: "23px",
      padding: "0",
      display: "grid",
      placeItems: "center",
      lineHeight: "0",
      position: "absolute",
      right: "8px",
      top: "8px",
    });

    header.append(htitle);
    dlg.appendChild(header);
    dlg.appendChild(closeX);

    const content = document.createElement("div");
    content.style.padding = "12px";
    content.style.fontSize = "13px";
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.innerHTML = `
<h2>Flowaway Goldenbody User Guide</h2>
<p>Flowaway Goldenbody is a desktop-style interface, built to feel familiar: you launch apps, organize windows, personalize your workspace, and move between tools without leaving the desktop.</p>

<h3>Start here: the desktop</h3>
<ul>
  <li>Open apps from the Start menu, desktop shortcuts, or the taskbar.</li>
  <li>Use the desktop like a normal workspace: place shortcuts where you want them and keep your most-used apps close at hand.</li>
  <li>Drag windows around the screen, resize them, and use the window controls to minimize, maximize, restore, or close apps.</li>
  <li>Switch between open apps from the taskbar or by using keyboard shortcuts like Ctrl+Tab or Alt+Tab. Use Shift+Tab instead of Tab to moves backward.</li>
</ul>

<h3>Start menu, taskbar, and pinned apps</h3>
<p>The Start menu is your main launcher. The taskbar helps you stay organized while working across multiple apps.</p>
<ul>
  <li>Pin your favorite apps so they are always easy to open.</li>
  <li>Use the Recent list to jump back to things you used recently.</li>
  <li>Browse all installed apps from the All Apps tab when you want a complete list.</li>
  <li>Use the Shortcuts tab for quick system actions like taking screenshots and changing brightness.</li>
  <li>If the taskbar is set to auto-hide, move your pointer to the edge of the screen to bring it back.</li>
</ul>

<h3>Desktop shortcuts and app launchers</h3>
<p>Shortcuts make it easier to open apps without hunting through menus every time.</p>
<ul>
  <li>Create desktop shortcuts for apps you use often.</li>
  <li>Move shortcuts around the desktop to build a layout that suits your workflow.</li>
  <li>Pin apps to the taskbar or Start menu for even faster access.</li>
  <li>If an app freezes, use the system settings to force it closed or review its status from the app manager.</li>
</ul>

<h3>Files and folders</h3>
<p>Flowaway Goldenbody includes a file system you can browse and manage from the file explorer. It is designed for organizing files, opening documents, and using apps that work with local content.</p>
<ul>
  <li>Open files from the file explorer.</li>
  <li>Use the built-in open-with flow when opening a file with an app.</li>
  <li>Keep important work organized in a few folders instead of scattering files across the desktop.</li>
  <li>Use file explorer to check app data, documents, and saved content.</li>
</ul>

<h3>App management and everyday tools</h3>
<p>You can manage full app experiences, inspect system state, and use helper tools for common tasks.</p>
<ul>
  <li>Use the Task Manager to see running apps. Not every app is listed there because most apps live on the main process; They are system apps.</li>
  <li>Open apps from the Start menu.</li>
  <li>Take screenshots and capture what is on screen when you need to share or save something quickly.</li>
</ul>

<h3>Customize the look and feel</h3>
<p>Settings lets you personalize the environment so it is easier to use for long sessions and everything feels comfortable.</p>
<ul>
  <li>Adjust brightness and dark mode.</li>
  <li>Change the wallpaper and desktop appearance.</li>
  <li>Set how the taskbar behaves, including auto-hide timing and location.</li>
  <li>Control notifications and other visual settings.</li>
  <li>Review installed apps and update or manage them from one place.</li>
</ul>

<h3>Notifications, accounts, and security</h3>
<p>Most desktop environments need some control over what apps can do. Flowaway Goldenbody gives you a central place to manage that without making it confusing.</p>
<ul>
  <li>Review app requests before allowing access to files, notifications, or other features.</li>
  <li>Turn non-system notifications off if you want fewer distractions.</li>
  <li>Change account settings or delete your account from Settings when needed.</li>
  <li>Use the app list and system controls to keep your workspace clean and stable.</li>
</ul>

<h3>Best practices</h3>
<ul>
  <li>Keep your most-used apps pinned so they are always one click away.</li>
  <li>Close apps you are done with to keep the taskbar and desktop tidy.</li>
  <li>Review permissions when an app asks for access, especially for file or notification features.</li>
  <li>Use the Start menu, shortcuts, and file explorer instead of digging through the system manually for regular tasks.</li>
  <li>If an app stops responding, try the Task Manager or the Settings app before removing anything important.</li>
</ul>

<h3>When to use the Developer Docs</h3>
<p>The Developer Docs are for people building or modifying apps, runtime features, or system internals. The User Guide is meant for everyday use: launching apps, organizing files, customizing the desktop, and getting work done.</p>

<h3>Quick summary</h3>
<p>Flowaway Goldenbody is a full desktop-style operating environment that allows you to launch apps, move between windows, browse files, personalize the experience, and manage the system from a central settings panel. Of course not every feature is listed here, the rest is for you to explore!</p>
<br>
<p>If you encountered any issues please check the error logs in /systemfiles/userprofile/logs/errorLogs.txt and report them to us.</p>
<h3>OS version</h3>
<p>${window.protectedGlobals.osVersion}</p>
`;

    dlg.appendChild(content);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "flex-end";
    footer.style.padding = "8px 12px 12px";
    footer.style.borderTop = "1px solid rgba(255,255,255,0.08)";

    const closeFooterBtn = document.createElement("button");
    closeFooterBtn.textContent = "Close";
    closeFooterBtn.className = "settings-primary-button";
    closeFooterBtn.onclick = () => dlg.remove();

    footer.appendChild(closeFooterBtn);
    dlg.appendChild(footer);

    document.body.appendChild(dlg);
    closeX.onclick = () => dlg.remove();

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    header.addEventListener("pointerdown", (ev) => {
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      origLeft = dlg.offsetLeft;
      origTop = dlg.offsetTop;
      header.setPointerCapture(ev.pointerId);
      document.body.style.userSelect = "none";
    });

    window.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      dlg.style.left = (origLeft + dx) + "px";
      dlg.style.top = Math.max(0, origTop + dy) + "px";
    });

    window.addEventListener("pointerup", (ev) => {
      if (!dragging) return;
      dragging = false;
      try {
        header.releasePointerCapture(ev.pointerId);
      } catch (e) {}
      document.body.style.userSelect = "";
    });
  }

  aboutBtn.addEventListener("click", showAboutDialog);
  userGuideBtn.addEventListener("click", showUserGuideDialog);

  window.settingsGlobals.allSettings.push({
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showAll: showAll,
    hideAll: hideAll,
    closeAll: closeAll,
    newWindow: newWindow,
    goldenbodyId: window.settingsGlobals.goldenbodyId,
  });
  window.protectedGlobals.applyStyles();

  return {
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showAll: showAll,
    hideAll: hideAll,
    closeAll: closeAll,
    newWindow: newWindow,
    goldenbodyId: window.settingsGlobals.goldenbodyId,
  };
};


