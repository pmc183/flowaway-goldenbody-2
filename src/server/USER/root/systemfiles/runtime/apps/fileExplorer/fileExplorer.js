"use strict";

//explorer global vars
window.explorerGlobals = {};
window.explorerGlobals.allExplorers = [];
window.explorerGlobals.goldenbodyId = 0;
// clipboard is an array of entries: { node, path, name, isFolder }
window.explorerGlobals.clipboard = [];
window.explorerGlobals.clipboardMode = "copy";

window.fileExplorer = async function (path = '/', posX = 50, posY = 50) {
  // Centralized function to retrieve an entry path
  function getEntryPath(item) {
    const metadataPath = String(item?.path || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "");
    if (metadataPath) return metadataPath;

    const name = String(item?.name || item?.filename || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean)
      .pop() || "";
    return name;
  }
  let initalized = false;
  let needRefresh = false;
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  let isMaximized = false;
  let _isMinimized = false;
  let disposed = false;
  let root = document.createElement("div");
  root.className = "app-root app-window-root";
  Object.assign(root.style, {
    position: "fixed",
    top: posY + "px",
    left: posX + "px",
    width: "860px",
    height: "580px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
    zIndex: 1000,
  });
  root.dataset.appId = "File Explorer";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  window.explorerGlobals.goldenbodyId++;
  root._goldenbodyId = window.explorerGlobals.goldenbodyId;
  const scopedListenerName = "fileExplorer" + root._goldenbodyId;

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
  btnClose.className = "btnCloseColor";
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

  const applyWindowControlIcon = window.protectedGlobals.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.protectedGlobals.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");

  topBar.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.appendChild(topBar);

  let savedBounds = {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };

  function getBounds() {
    return {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };
  }

  function applyBounds(bounds) {
    if (!bounds) return;
    root.style.left = bounds.left;
    root.style.top = bounds.top;
    root.style.width = bounds.width;
    root.style.height = bounds.height;
  }

  function maximizeWindow() {
    savedBounds = getBounds();
    root.style.left = "0";
    root.style.top = window.protectedGlobals.data.autohidetaskbar ? '0px' : window.protectedGlobals.currentAppMaximizedTop;    root.style.width = "100%";
    root.style.height = window.protectedGlobals.data.autohidetaskbar ? '100%' : `calc(100% - ${window.protectedGlobals.currentTaskbarHeight}px)`;
    root.style.borderRadius = "0";
    isMaximized = true;
    _isMinimized = false;
    setWindowMaximizeIcon(btnMax, true);
  }

  function restoreWindow(useOriginalBounds = true) {
    if (useOriginalBounds && savedBounds) {
      applyBounds(savedBounds);
    }
    root.style.borderRadius = "10px";
    isMaximized = false;
    setWindowMaximizeIcon(btnMax, false);
  }

  function hideWindow() {
    if (!isMaximized) savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    if (disposed) return;
    root.style.display = "flex";
    _isMinimized = false;
    window.protectedGlobals.bringToFront(root);
  }

  function closeWindow() {
    if (disposed) return;
    disposed = true;
    root.remove();
    const index = window.explorerGlobals.allExplorers.findIndex(
      (instance) => instance.rootElement === root,
    );
    if (index !== -1) window.explorerGlobals.allExplorers.splice(index, 1);

    if ((window.protectedGlobals.removeAllEventListenersForApp)) {
      window.protectedGlobals.removeAllEventListenersForApp(scopedListenerName);
    }
    root.innerHTML = "";
    root = null;
  }

  function closeAll() {
    for (const instance of [...window.explorerGlobals.allExplorers]) {
      if (instance && (instance.closeWindow)) {
        instance.closeWindow();
      }
    }
    window.explorerGlobals.allExplorers = [];
  }

  function hideAll() {
    for (const instance of window.explorerGlobals.allExplorers) {
      if (instance && (instance.hideWindow)) {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    window.explorerGlobals.allExplorers.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of window.explorerGlobals.allExplorers) {
      if (instance && (instance.showWindow)) {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    fileExplorer("/", 50, 50);
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
  makeDraggableResizable(root, dragStrip);
  // --- Make draggable/resizable from previous snippet ---
  function makeDraggableResizable(el, dragTarget) {
    let active = null;
    (function makeDraggable() {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      let thresholdCrossed = false;
      let DRAG_THRESHOLD = window.protectedGlobals.data.DRAG_THRESHOLD || 15;
      let currentX, currentY;

      dragTarget.addEventListener("pointerdown", (ev) => {
        if (active) return;
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

      window.addEventListener(scopedListenerName, "pointermove", (ev) => {
        if (!dragging || disposed) return;
        if (active) return;
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
        );
        if (!thresholdCrossed && dragDistance >= DRAG_THRESHOLD) {
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

      window.addEventListener(scopedListenerName, "pointerup", () => {
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
        if (active || disposed) return;
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
        if (disposed) return;
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
        if (!active || disposed) return;
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
  window.explorerGlobals.allExplorers.push({
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
    goldenbodyId: window.explorerGlobals.goldenbodyId,
  });
  window.protectedGlobals.applyStyles();
  let selectedItem = null; // single right-click selection
  let selectedItems = []; // array for multi-select
  let directions = [];

  // --- CONFIG ---
  const username = window.protectedGlobals.data.username;
  let currentPath = ["/"];
  let treeData = null; // Used only for the explicit full-filesystem global search.
  // UI state: sort and display modes
  let profile = {};
  try {
    profile = JSON.parse(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", { text: true, direct: true }));
  } catch (e) {}
    
  if (!profile.sortMode || !profile.sortOrder || !profile.displayMode) {
    profile = {
      sortMode: "name", // name | size | date
      sortOrder: "asc", // asc | desc
      displayMode: "list", // list | tiles
    };
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
  }

  function getCurrentFolderPath() {
    return currentPath.slice(1).join("/") + (currentPath.length > 1 ? "/" : "");
  }

  // --- ELEMENTS ---
  let isDark = !!(window.protectedGlobals && window.protectedGlobals.data.dark);
  let sidebar = null;
  let topbar = null;
  let breadcrumbs = null;
  let controls = null;
  let sortSelect = null;
  let sortOrderBtn = null;
  let viewToggle = null;
  let fileArea = null;
  let contextMenu = null;
  let storageDiv = null;
  let statusDiv = null;
  let refreshBtn = null;
  let uploadBtn = null;
  let homeBtn = null;
  let trashBtn = null;
  let emptyTrashBtn = null;
  let createFolderBtn = null;
  let createFileBtn = null;
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.height = "100%";
  root.style.color = isDark ? "#e6eef8" : "#111";
  root.style.background = isDark ? "#0f172a" : "#ffffff";
  root.appendChild(container);

  // Sidebar
  sidebar = document.createElement("div");
  sidebar.style.minWidth = "min(210px, 14.5%)";
  sidebar.style.maxWidth = "min(210px, 14.5%)";
  sidebar.style.background = "#1e293b";
  sidebar.style.color = "white";
  sidebar.style.padding = "10px";
  sidebar.style.display = "flex";
  sidebar.style.flexDirection = "column";
  sidebar.style.gap = "6px";
  container.appendChild(sidebar);
  let text = document.createElement("h3");
  text.textContent = window.protectedGlobals.data.username;
  sidebar.appendChild(text);
  sidebar.appendChild(document.createElement("br"));
  refreshBtn = document.createElement("button");
  // helper to create simple SVG icons (uses currentColor for strokes)
const ICONS = {
  refresh: `
    <path d="M21 2v6h-6"/>
    <path d="M20.49 13A8.5 8.5 0 1 1 18 5.3L21 8"/>
  `,

  upload: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /> </svg>`,

  home: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /> </svg>`,

  trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /> </svg>`,

  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6"> <!-- folder body --> <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h4.2c.6 0 1.2.2 1.6.6l1.2 1.1c.2.2.5.3.8.3h5.2A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7Z" fill="#FDCB22" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /> <!-- subtle fold highlight (not a cut, just visual depth) --> <path d="M3 11.2H21" stroke="#000000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" /> </svg>`,

  file: `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
  `,

  chev: `
    <path d="m9 18 6-6-6-6"/>
  `,

  list: `
    <path d="M8 6h13"/>
    <path d="M8 12h13"/>
    <path d="M8 18h13"/>
    <path d="M3 6h.01"/>
    <path d="M3 12h.01"/>
    <path d="M3 18h.01"/>
  `,

  grid: `
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  `,

  warning: `
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  `
};

function makeIcon(type, size = 16) {
  const ns = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(ns, "svg");

  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  svg.style.verticalAlign = "middle";
  svg.style.flexShrink = "0";
  svg.style.display = "block";

  svg.innerHTML = ICONS[type] || "";

  return svg;
}

  function styleSidebarButton(btn) {
    if (!btn) return;
    btn.style.color = isDark ? "#f8fafc" : "#111";
    btn.style.background = isDark ? "rgba(255,255,255,0.08)" : "#f8fafc";
    btn.style.border = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #d1d5db";
    btn.style.borderRadius = "8px";
    btn.style.padding = "8px 10px";
    btn.style.textAlign = "left";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "flex-start";
    btn.style.gap = "8px";
    btn.style.lineHeight = "1";
  }

  refreshBtn.innerHTML = '';
  refreshBtn.appendChild(makeIcon('refresh',16));
  refreshBtn.appendChild(document.createTextNode('Refresh'));
  styleSidebarButton(refreshBtn);
  sidebar.appendChild(refreshBtn);

  uploadBtn = document.createElement("button");
  uploadBtn.innerHTML = '';
  uploadBtn.appendChild(makeIcon('upload',16));
  uploadBtn.appendChild(document.createTextNode('Upload'));
  styleSidebarButton(uploadBtn);
  sidebar.appendChild(uploadBtn);

  homeBtn = document.createElement("button");
  homeBtn.innerHTML = '';
  homeBtn.appendChild(makeIcon('home',16));
  homeBtn.appendChild(document.createTextNode('Home'));
  styleSidebarButton(homeBtn);
  sidebar.appendChild(homeBtn);

  trashBtn = document.createElement("button");
  trashBtn.innerHTML = '';
  trashBtn.appendChild(makeIcon('trash',16));
  trashBtn.appendChild(document.createTextNode('Trash'));
  styleSidebarButton(trashBtn);
  sidebar.appendChild(trashBtn);

  emptyTrashBtn = document.createElement("button");
  emptyTrashBtn.innerHTML = '';
  emptyTrashBtn.appendChild(makeIcon('trash',16));
  emptyTrashBtn.appendChild(document.createTextNode('Empty Trash'));
  emptyTrashBtn.style.display = "none";
  styleSidebarButton(emptyTrashBtn);
  sidebar.appendChild(emptyTrashBtn);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  sidebar.appendChild(fileInput);

  const uploadProgress = document.createElement("div");
  uploadProgress.style.position = "absolute";
  uploadProgress.style.left = "16px";
  uploadProgress.style.right = "16px";
  uploadProgress.style.bottom = "16px";
  uploadProgress.style.zIndex = "2000";
  uploadProgress.style.display = "none";
  uploadProgress.style.flexDirection = "column";
  uploadProgress.style.gap = "8px";
  uploadProgress.style.padding = "10px 12px";
  uploadProgress.style.borderRadius = "10px";
  uploadProgress.style.background = "rgba(15, 23, 42, 0.92)";
  uploadProgress.style.color = "white";
  uploadProgress.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  uploadProgress.style.pointerEvents = "none";
  uploadProgress.style.backdropFilter = "blur(4px)";
  uploadProgress.style.fontSize = "13px";
  const uploadProgressTitle = document.createElement("div");
  uploadProgressTitle.style.fontWeight = "600";
  const uploadProgressStatus = document.createElement("div");
  uploadProgressStatus.style.opacity = "0.85";
  const uploadProgressBarOuter = document.createElement("div");
  uploadProgressBarOuter.style.height = "10px";
  uploadProgressBarOuter.style.borderRadius = "999px";
  uploadProgressBarOuter.style.overflow = "hidden";
  uploadProgressBarOuter.style.background = "rgba(255,255,255,0.15)";
  const uploadProgressBarInner = document.createElement("div");
  uploadProgressBarInner.style.height = "100%";
  uploadProgressBarInner.style.width = "0%";
  uploadProgressBarInner.style.borderRadius = "999px";
  uploadProgressBarInner.style.background = "linear-gradient(90deg, #22c55e, #38bdf8)";
  uploadProgressBarOuter.appendChild(uploadProgressBarInner);
  uploadProgress.appendChild(uploadProgressTitle);
  uploadProgress.appendChild(uploadProgressStatus);
  uploadProgress.appendChild(uploadProgressBarOuter);
  root.appendChild(uploadProgress);

  const uploadState = {
    visible: false,
    totalBytes: 0,
    doneBytes: 0,
    title: "",
    status: "",
    hideTimer: null,
    error: false,
    sessionId: 0,
    activeSessions: new Map(),
  };

  function renderUploadProgress() {
    const sessions = [...uploadState.activeSessions.values()];
    if (!sessions.length) {
      uploadProgress.style.display = "none";
      uploadState.visible = false;
      uploadState.error = false;
      return;
    }

    const totalBytes = sessions.reduce((sum, session) => sum + (session.totalBytes || 0), 0);
    const doneBytes = sessions.reduce((sum, session) => sum + (session.doneBytes || 0), 0);
    const hasError = sessions.some((session) => session.error);

    uploadState.visible = true;
    uploadState.totalBytes = totalBytes;
    uploadState.doneBytes = doneBytes;
    uploadState.error = hasError;
    uploadProgress.style.display = "flex";
    uploadProgressTitle.textContent = sessions.length > 1 ? `Uploading ${sessions.length} files` : (sessions[0].title || "Uploading files");
    uploadProgressStatus.textContent = sessions.length > 1
      ? `${sessions.length} uploads in progress`
      : (sessions[0].status || "");
    const pct = totalBytes > 0 ? Math.max(0, Math.min(100, (doneBytes / totalBytes) * 100)) : 0;
    uploadProgressBarInner.style.width = `${pct}%`;
    uploadProgressBarInner.style.background = hasError
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #38bdf8)";
  }

  function showUploadProgress(title, status, totalBytes) {
    uploadState.sessionId += 1;
    const sessionId = uploadState.sessionId;
    uploadState.activeSessions.set(sessionId, {
      id: sessionId,
      title: title || "Uploading files",
      status: status || "",
      totalBytes: Math.max(0, Number(totalBytes) || 0),
      doneBytes: 0,
      error: false,
    });

    if (uploadState.hideTimer) {
      clearTimeout(uploadState.hideTimer);
      uploadState.hideTimer = null;
    }
    renderUploadProgress();
    return sessionId;
  }

  function updateUploadProgress(doneBytes, status, sessionId = uploadState.sessionId) {
    const session = uploadState.activeSessions.get(sessionId);
    if (!session) return;
    session.doneBytes = Math.max(0, Math.min(session.totalBytes, Number(doneBytes) || 0));
    if (status !== undefined) session.status = status;
    renderUploadProgress();
  }

  function setUploadError(title, status, sessionId = uploadState.sessionId) {
    const session = uploadState.activeSessions.get(sessionId);
    if (session) {
      session.title = title || "Upload failed";
      session.status = status || "";
      session.error = true;
      session.doneBytes = Math.max(session.doneBytes, session.totalBytes);
    }
    if (uploadState.hideTimer) clearTimeout(uploadState.hideTimer);
    uploadState.activeSessions.delete(sessionId);
    uploadProgress.style.display = "none";
    uploadState.visible = false;
    uploadState.error = false;
    renderUploadProgress();
  }

  function hideUploadProgress(delay = 700, sessionId = uploadState.sessionId) {
    if (uploadState.activeSessions.size > 0) return;
    if (uploadState.hideTimer) clearTimeout(uploadState.hideTimer);
    uploadState.hideTimer = setTimeout(() => {
      if (uploadState.activeSessions.size > 0) return;
      uploadState.visible = false;
      uploadState.error = false;
      renderUploadProgress();
    }, delay);
  }

  function applyExplorerTheme() {
    isDark = !!(window.protectedGlobals && window.protectedGlobals.data.dark);
    root.style.color = isDark ? "#e6eef8" : "#111";
    root.style.background = isDark ? "#0f172a" : "#ffffff";
    if (sidebar) {
      sidebar.style.background = isDark ? "#1e293b" : "#f8fafc";
      sidebar.style.color = isDark ? "#f8fafc" : "#111";
    }
    if (topbar) {
      topbar.style.background = isDark ? "#0f172a" : "#ffffff";
      topbar.style.color = isDark ? "#e6eef8" : "#111";
      topbar.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #ddd";
    }
    if (breadcrumbs) {
      breadcrumbs.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (controls) {
      controls.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
      controls.style.boxShadow = isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.6)";
    }
    if (sortSelect) {
      sortSelect.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
      sortSelect.style.background = isDark ? "#111827" : "transparent";
      sortSelect.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (sortOrderBtn) {
      sortOrderBtn.style.background = isDark ? "#111827" : "transparent";
      sortOrderBtn.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (viewToggle) {
      viewToggle.style.background = isDark ? "#111827" : "transparent";
      viewToggle.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (fileArea) {
      fileArea.style.background = isDark ? "#0f172a" : "#ffffff";
      fileArea.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (storageDiv) {
      storageDiv.style.color = isDark ? "#cbd5e1" : "#334155";
    }
    if (statusDiv) {
      statusDiv.style.color = isDark ? "#cbd5e1" : "#334155";
    }
    if (contextMenu) {
      contextMenu.style.border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ccc";
      contextMenu.style.background = isDark ? "#0b0b0b" : "white";
      contextMenu.style.color = isDark ? "#e6eef8" : "#111";
      contextMenu.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
    }
    [refreshBtn, uploadBtn, homeBtn, trashBtn, emptyTrashBtn, createFolderBtn, createFileBtn].forEach(styleSidebarButton);
    // Apply theme to search inputs if they exist
    if (currentDirSearchInput) {
      currentDirSearchInput.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
      currentDirSearchInput.style.background = isDark ? "#111827" : "transparent";
      currentDirSearchInput.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (globalSearchInput) {
      globalSearchInput.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
      globalSearchInput.style.background = isDark ? "#111827" : "transparent";
      globalSearchInput.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (autocompleteHints) {
      autocompleteHints.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
      autocompleteHints.style.background = isDark ? "#111827" : "white";
      autocompleteHints.style.color = isDark ? "#e6eef8" : "#111";
      autocompleteHints.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
    }
  }

  // Main area
  const main = document.createElement("div");
  main.style.flex = "1";
  main.style.display = "flex";
  main.style.flexDirection = "column";
  main.style.maxWidth = "100%";
  container.appendChild(main);

  topbar = document.createElement("div");
  topbar.style.display = "flex";
  topbar.style.flexDirection = "column";
  topbar.style.gap = "8px";
  topbar.style.padding = "8px";
  topbar.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #ddd";
  topbar.style.background = isDark ? "#0f172a" : "#ffffff";
  topbar.style.color = isDark ? "#e6eef8" : "#111";
  main.appendChild(topbar);

  const topbarRow = document.createElement("div");
  topbarRow.style.display = "flex";
  topbarRow.style.flexWrap = "wrap";
  topbarRow.style.alignItems = "center";
  topbarRow.style.justifyContent = "space-between";
  topbarRow.style.gap = "8px";
  topbar.appendChild(topbarRow);

  breadcrumbs = document.createElement("div");
  breadcrumbs.style.color = isDark ? "#e6eef8" : "#111";
  topbarRow.appendChild(breadcrumbs);
  // Controls: sort and view mode
  controls = document.createElement("div");
  controls.style.display = "inline-flex";
  controls.style.gap = "8px";
  controls.style.alignItems = "center";
  controls.style.flex = "0 0 auto";
  controls.style.background = window.protectedGlobals && window.protectedGlobals.data.dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6';
  controls.style.padding = '6px';
  controls.style.borderRadius = '10px';
  controls.style.boxShadow = window.protectedGlobals && window.protectedGlobals.data.dark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6)';

  sortSelect = document.createElement("select");
  [
    { v: "name", t: "Sort: Name" },
    { v: "size", t: "Sort: Size" },
    { v: "date", t: "Sort: Date" },
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.v;
    o.textContent = opt.t;
    sortSelect.appendChild(o);
  });
  sortSelect.value = profile.sortMode;
  sortSelect.onchange = () => {
    profile.sortMode = sortSelect.value;
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };
  // modern select styling
  sortSelect.style.padding = '6px 8px';
  sortSelect.style.border = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)';
  sortSelect.style.borderRadius = '6px';
  sortSelect.style.background = isDark ? '#111827' : 'transparent';
  sortSelect.style.color = isDark ? '#e6eef8' : '#111';
  sortSelect.style.fontSize = '13px';

  sortOrderBtn = document.createElement("button");
  sortOrderBtn.textContent = profile.sortOrder === "asc" ? "↑" : "↓";
  sortOrderBtn.title = "Toggle sort order";
  sortOrderBtn.onclick = () => {
    profile.sortOrder = profile.sortOrder === "asc" ? "desc" : "asc";
    sortOrderBtn.textContent = profile.sortOrder === "asc" ? "↑" : "↓";
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };
  sortOrderBtn.style.border = 'none';
  sortOrderBtn.style.padding = '6px 8px';
  sortOrderBtn.style.borderRadius = '6px';
  sortOrderBtn.style.background = isDark ? '#111827' : 'transparent';
  sortOrderBtn.style.color = isDark ? '#e6eef8' : '#111';
  sortOrderBtn.style.cursor = 'pointer';

  viewToggle = document.createElement("button");
  viewToggle.title = "Toggle view (list / tiles)";
  // style the toggle as a modern pill button
  viewToggle.style.border = 'none';
  viewToggle.style.padding = '6px 8px';
  viewToggle.style.borderRadius = '8px';
  viewToggle.style.background = isDark ? '#111827' : 'transparent';
  viewToggle.style.color = isDark ? '#e6eef8' : '#111';
  viewToggle.style.cursor = 'pointer';
  viewToggle.style.display = 'inline-flex';
  viewToggle.style.alignItems = 'center';
  viewToggle.style.justifyContent = 'center';

  function updateViewToggleIcon() {
    viewToggle.innerHTML = '';
    // show the icon representing the current mode
    const iconType = profile.displayMode === 'list' ? 'list' : 'grid';
    const icon = makeIcon(iconType, 14);
    // make the icon inherit color from button
    icon.style.color = '';
    viewToggle.appendChild(icon);
    viewToggle.title = profile.displayMode === 'list' ? 'List view' : 'Tiles view';
  }
  updateViewToggleIcon();
  viewToggle.onclick = () => {
    profile.displayMode = profile.displayMode === "list" ? "tiles" : "list";
    updateViewToggleIcon();
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };

  controls.appendChild(sortSelect);
  controls.appendChild(sortOrderBtn);
  controls.appendChild(viewToggle);

  // --- SEARCH BARS ---
  // Create search container positioned on the left
  const searchContainer = document.createElement("div");
  searchContainer.style.display = "flex";
  searchContainer.style.flexWrap = "wrap";
  searchContainer.style.gap = "8px";
  searchContainer.style.alignItems = "center";
  searchContainer.style.flex = "1 1 320px";
  searchContainer.style.minWidth = "260px";
  searchContainer.style.marginRight = "16px";

  // SEARCH 1: Current directory search
  const currentDirSearchContainer = document.createElement("div");
  currentDirSearchContainer.style.position = "relative";
  currentDirSearchContainer.style.flex = "1 1 210px";
  currentDirSearchContainer.style.minWidth = "180px";

  const currentDirSearchInput = document.createElement("input");
  currentDirSearchInput.type = "text";
  currentDirSearchInput.placeholder = "Search in folder...";
  currentDirSearchInput.style.width = "100%";
  currentDirSearchInput.style.padding = "6px 8px";
  currentDirSearchInput.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
  currentDirSearchInput.style.borderRadius = "6px";
  currentDirSearchInput.style.background = isDark ? "#111827" : "transparent";
  currentDirSearchInput.style.color = isDark ? "#e6eef8" : "#111";
  currentDirSearchInput.style.fontSize = "13px";
  currentDirSearchContainer.appendChild(currentDirSearchInput);

  // SEARCH 2: Global search with autocomplete
  const globalSearchContainer = document.createElement("div");
  globalSearchContainer.style.position = "relative";
  globalSearchContainer.style.flex = "1 1 210px";
  globalSearchContainer.style.minWidth = "180px";

  const globalSearchInput = document.createElement("input");
  globalSearchInput.type = "text";
  globalSearchInput.placeholder = "Find files...";
  globalSearchInput.style.width = "100%";
  globalSearchInput.style.padding = "6px 8px";
  globalSearchInput.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
  globalSearchInput.style.borderRadius = "6px";
  globalSearchInput.style.background = isDark ? "#111827" : "transparent";
  globalSearchInput.style.color = isDark ? "#e6eef8" : "#111";
  globalSearchInput.style.fontSize = "13px";
  globalSearchContainer.appendChild(globalSearchInput);

  // Autocomplete hints dropdown for global search
  const autocompleteHints = document.createElement("div");
  autocompleteHints.style.position = "absolute";
  autocompleteHints.style.top = "100%";
  autocompleteHints.style.left = "0";
  autocompleteHints.style.right = "0";
  autocompleteHints.style.marginTop = "2px";
  autocompleteHints.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
  autocompleteHints.style.borderRadius = "6px";
  autocompleteHints.style.background = isDark ? "#111827" : "white";
  autocompleteHints.style.color = isDark ? "#e6eef8" : "#111";
  autocompleteHints.style.maxHeight = "200px";
  autocompleteHints.style.overflowY = "auto";
  autocompleteHints.style.display = "none";
  autocompleteHints.style.zIndex = "1001";
  autocompleteHints.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
  globalSearchContainer.appendChild(autocompleteHints);

  // Helper function to search tree recursively
  function searchTreeForNodes(query, node = treeData, path = ["/"], results = []) {
    if (!node || !node[1]) return results;
    
    const queryLower = query.toLowerCase();
    for (const child of node[1]) {
      const nameLower = (child[0] || "").toLowerCase();
      if (nameLower.includes(queryLower)) {
        results.push({
          name: child[0],
          path: path.slice(1).join("/") + (path.length > 1 ? "/" : "") + child[0],
          fullPath: [...path, child[0]],
          isFolder: Array.isArray(child[1]),
          node: child,
        });
      }
      if (Array.isArray(child[1])) {
        searchTreeForNodes(query, child, [...path, child[0]], results);
      }
    }
    return results;
  }

  // Sort search results by relevance
  function sortByRelevance(results, query) {
    const queryLower = query.toLowerCase();
    return results.sort((a, b) => {
      // Exact match first
      if (a.name.toLowerCase() === queryLower) return -1;
      if (b.name.toLowerCase() === queryLower) return 1;
      // Starts with query
      if (a.name.toLowerCase().startsWith(queryLower)) return -1;
      if (b.name.toLowerCase().startsWith(queryLower)) return 1;
      // Contains query
      const aIdx = a.name.toLowerCase().indexOf(queryLower);
      const bIdx = b.name.toLowerCase().indexOf(queryLower);
      return aIdx - bIdx;
    });
  }

  // Handle current directory search
  currentDirSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = currentDirSearchInput.value;
      if (!query) return;
      
      const items = currentEntries;
      const queryLower = query.toLowerCase();
      const matching = items.filter(item => getEntryName(item).toLowerCase().includes(queryLower));
      
      selectedItems = matching;
      lastSelectedIndex = matching.length - 1;
      refreshSelectionUI(items);
      currentDirSearchInput.value = "";
    }
  });

  // Handle global search with autocomplete
  let globalSearchTimeout;
  globalSearchInput.addEventListener("input", (e) => {
    clearTimeout(globalSearchTimeout);
    const query = e.target.value;

    if (!query) {
      autocompleteHints.style.display = "none";
      autocompleteHints.innerHTML = "";
      return;
    }

    globalSearchTimeout = setTimeout(async () => {
      try {
        const data = await window.protectedGlobals.filePost({ initFE: true });
        if (!data || !data.tree) return;
        treeData = data.tree;
        window.protectedGlobals.annotateTreeWithPaths(treeData);
      } catch (err) {
        console.warn("File Explorer global search tree load failed", err);
        return;
      }

      const results = searchTreeForNodes(query);
      const sortedResults = sortByRelevance(results, query);
      
      autocompleteHints.innerHTML = "";
      
      if (sortedResults.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No results found";
        empty.style.padding = "8px 10px";
        empty.style.opacity = "0.6";
        empty.style.cursor = "default";
        autocompleteHints.appendChild(empty);
        autocompleteHints.style.display = "block";
        return;
      }
      
      sortedResults.forEach((result, index) => {
        const hint = document.createElement("div");
        hint.style.padding = "8px 10px";
        hint.style.cursor = "pointer";
        hint.style.borderBottom = index < sortedResults.length - 1 ? (isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)") : "none";
        hint.style.background = "transparent";
        hint.style.fontSize = "13px";
        
        const hintText = document.createElement("div");
        hintText.textContent = result.name;
        hintText.style.fontWeight = "500";
        hint.appendChild(hintText);
        
        const hintPath = document.createElement("div");
        hintPath.textContent = result.path;
        hintPath.style.fontSize = "11px";
        hintPath.style.opacity = "0.6";
        hint.appendChild(hintPath);
        
        hint.addEventListener("mouseenter", () => {
          hint.style.background = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
        });
        hint.addEventListener("mouseleave", () => {
          hint.style.background = "transparent";
        });
        
        hint.addEventListener("click", async () => {
          // Navigate to the item via the modern directory API.
          if (result.isFolder) {
            currentPath = result.fullPath.slice();
          } else {
            currentPath = result.fullPath.slice(0, -1);
          }
          await refreshCurrentFolder({ scroll: true });
          const node = currentEntries.find((entry) => getEntryName(entry) === result.name);
          selectedItems = node ? [node] : [];
          lastSelectedIndex = 0;
          globalSearchInput.value = "";
          autocompleteHints.style.display = "none";
          render({ scroll: true });
        });
        
        autocompleteHints.appendChild(hint);
      });
      
      autocompleteHints.style.display = "block";
    }, 1000); // debounce for 1000ms
  });

  // Handle Enter key on global search
  globalSearchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const query = globalSearchInput.value;
      if (!query) return;

      const data = await window.protectedGlobals.filePost({ initFE: true }).catch(() => null);
      if (!data || !data.tree) return;
      treeData = data.tree;
      window.protectedGlobals.annotateTreeWithPaths(treeData);

      const results = searchTreeForNodes(query);
      const sortedResults = sortByRelevance(results, query);

      if (sortedResults.length > 0) {
        const first = sortedResults[0];
        currentPath = first.isFolder
          ? first.fullPath.slice()
          : first.fullPath.slice(0, -1);
        await refreshCurrentFolder({ scroll: true });
        const node = currentEntries.find((entry) => getEntryName(entry) === first.name);
        selectedItems = node ? [node] : [];
        lastSelectedIndex = 0;
        globalSearchInput.value = "";
        autocompleteHints.style.display = "none";
      }
    }
  });

  // Close autocomplete when clicking outside
  document.addEventListener("pointerdown", (e) => {
    if (!globalSearchContainer.contains(e.target)) {
      autocompleteHints.style.display = "none";
    }
  }, true);

  searchContainer.appendChild(currentDirSearchContainer);
  searchContainer.appendChild(globalSearchContainer);

  const searchRow = document.createElement("div");
  searchRow.style.display = "flex";
  searchRow.style.flexWrap = "wrap";
  searchRow.style.gap = "8px";
  searchRow.style.alignItems = "center";
  searchRow.style.justifyContent = "space-between";
  topbar.appendChild(searchRow);
  searchRow.appendChild(searchContainer);
  searchRow.appendChild(controls);

  fileArea = document.createElement("div");
  fileArea.style.flex = "1";
  fileArea.style.overflowY = "auto";
  fileArea.style.padding = "8px";
  fileArea.style.maxWidth = "100%";
  fileArea.style.background = isDark ? "#0f172a" : "#ffffff";
  fileArea.style.color = isDark ? "#e6eef8" : "#111";
  main.appendChild(fileArea);
  fileArea.tabIndex = "1";

  contextMenu = document.createElement("div");
  contextMenu.style.position = "absolute";
  contextMenu.className = "misc";
  // adapt appearance for dark/light themes
  contextMenu.style.border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ccc";
  contextMenu.style.background = isDark ? "#0b0b0b" : "white";
  contextMenu.style.color = isDark ? "#e6eef8" : "#111";
  contextMenu.style.display = "none";
  contextMenu.style.zIndex = "1000";
  contextMenu.style.borderRadius = "10px";
  contextMenu.style.padding = "4px";
  contextMenu.style.minWidth = "220px";
  contextMenu.style.maxWidth = "260px";
  contextMenu.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
  root.appendChild(contextMenu);

  fileArea.oncontextmenu = (e) => {
    e.preventDefault();

    // If right-clicked on a file/folder row, let that handler run
    const row = e.target?.closest?.("[data-fs-item]");
    if (row) return;

    // Blank area
    selectedItem = null;
    showContextMenu(e.clientX, e.clientY, false, true);
  };

  // --- RENDER ---
  let currentEntries = [];

  function normalizeReadFolderEntries(files) {
    const folderApiPath = getCurrentFolderApiPath();
    return (Array.isArray(files) ? files : []).map((file) => {
      if (typeof file === "string") {
        const name = String(file).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).pop() || "";
        if (!name) return null;
        const path = folderApiPath === "/" ? name : `${folderApiPath}/${name}`;
        return {
          name,
          type: "file",
          path,
          size: 0,
          sizeOnDisk: 4096,
          mtime: 0,
        };
      }

      const name = String(file.name || file.filename || file.path || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean)
        .pop() || "";
      if (!name) return null;

      const type = String(file.type || file.kind || "").toLowerCase();
      const isFolder = type === "folder" || file.folder === true || file.isFolder === true;
      const size = Number(file.size) || 0;
      const path = folderApiPath === "/" ? name : `${folderApiPath}/${name}`;
      return {
        ...file,
        name,
        type: isFolder ? "folder" : "file",
        path,
        size,
        sizeOnDisk: Number(file.sizeOnDisk) || (isFolder ? 4096 : getEntryOnDiskSize(size)),
        mtime: Number(file.mtime ?? file.modified ?? file.lastModified) || 0,
      };
    }).filter(Boolean);
  }

  function getCurrentFolderApiPath(pathArray = currentPath) {
    const parts = (Array.isArray(pathArray) ? pathArray : ["/"]).slice(1).filter(Boolean);
    return parts.length ? parts.join("/") : "/";
  }

  function getEntryName(entry) {
    return String(entry?.name || "").replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
  }

  function isFolderEntry(entry) {
    return entry?.type === "folder" || entry?.isFolder === true || entry?.folder === true;
  }

  async function refreshCurrentFolder(options = {}) {
    return withOperationStatus("Loading folder...", async () => {
      const apiPath = getCurrentFolderApiPath();
      const files = await window.protectedGlobals.ReadFolder(apiPath, {
        detail: true,
        directoryDetail: false,
      }).catch(() => []);

      currentEntries = normalizeReadFolderEntries(files);
      initalized = true;
      render(options);
      await updateStorageDisplay();
      return currentEntries;
    }, "All Files Loaded.", { noUpdate: true });
  }

  async function onlyLoadFolder(path) {
    return withOperationStatus("Loading folder...", async () => {
      let startupPath = path;
      if (startupPath && startupPath !== "/") {
        const normalized = String(startupPath).replace(/^\/+|\/+$/g, "");
        currentPath = ["/", ...normalized.split("/").filter(Boolean)];
      } else {
        currentPath = ["/"];
      }

      const apiPath = getCurrentFolderApiPath();
      const files = await window.protectedGlobals.ReadFolder(apiPath, {
        detail: true,
        directoryDetail: false,
      }).catch(() => null);

      if (!Array.isArray(files) && startupPath && startupPath !== "/") {
        currentPath = ["/"];
        await refreshCurrentFolder();
        return;
      }

      currentEntries = normalizeReadFolderEntries(files);
      initalized = true;
      render();
    });
  }

  function formatSize(bytes) {
    if (bytes === 0) return "0 B";
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB";
    return (bytes / 1024 ** 3).toFixed(1) + " GB";
  }

  function formatDate(ts) {
    if (!ts) return "";
    try {
      const d = new Date(Number(ts));
      return d.toLocaleString();
    } catch (e) {
      return String(ts);
    }
  }

  function renderBreadcrumbs() {
    breadcrumbs.innerHTML = "";
    currentPath.forEach((p, i) => {
      const span = document.createElement("span");
      span.textContent = i === 0 ? "Home" : " / " + truncateDisplayName(p);
      span.title = i === 0 ? "Home" : p;
      span.style.cursor = "pointer";
      span.onclick = async () => {
        currentPath = currentPath.slice(0, i + 1);
        await refreshCurrentFolder();
      };
      breadcrumbs.appendChild(span);
    });
  }

  function getEntryOnDiskSize(bytes) {
    const size = Number(bytes) || 0;
    return Math.max(0, size) + 4096;
  }


  function isOutOfStorageError(value) {
    const message = String(
      value?.error || value?.message || value?.body?.error || value?.body?.message || value || ""
    ).toLowerCase();
    return message.includes("storage exceeded") || message.includes("quota exceeded");
  }

  // Update the storage display element in the sidebar.
  async function updateStorageDisplay() {
    try {

      async function calculateFolderUsage(folderPath) {
        const entries = await window.protectedGlobals.ReadFolder(folderPath, {
          detail: true,
          directoryDetail: true,
        }).catch(() => []);

        let total = 0;
        for (const entry of Array.isArray(entries) ? entries : []) {
          const sizeOnDisk = Number(entry?.sizeOnDisk);
          if (Number.isFinite(sizeOnDisk) && sizeOnDisk > 0) {
            total += sizeOnDisk;
          } else {
            const size = Number(entry?.size) || 0;
            total += getEntryOnDiskSize(size);
          }
        }
        return total;
      }

      const total = await calculateFolderUsage("/");
      storageDiv.textContent = `Storage used: ${formatSize(total)}/${window.protectedGlobals.data.maxSpace} GB`;
    } catch (e) {
      console.error("updateStorageDisplay error:", e);
      storageDiv.textContent = "Storage used: —";
    }
  }

  let lastSelectedIndex = null;

  function selectEntriesByNames(names, options = {}) {
    const requestedNames = new Set(
      (Array.isArray(names) ? names : [names])
        .map((name) => String(name ?? ""))
        .filter(Boolean)
    );

    selectedItems = currentEntries.filter((entry) =>
      requestedNames.has(getEntryName(entry))
    );

    if (selectedItems.length) {
      selectedItem = selectedItems[selectedItems.length - 1];
      lastSelectedIndex = currentEntries.indexOf(selectedItem);
    } else {
      selectedItem = null;
      lastSelectedIndex = null;
    }

    // Always render first, then apply selection to the completed DOM.  This
    // keeps selection in sync with the sorted/filtered render and tiles/list
    // view modes that use a separate item index.
    render({ scroll: false });
    requestAnimationFrame(() => {
      if (disposed || !root) return;
      refreshSelectionUI(currentEntries);
      if (options.scroll !== false) scrollToSelected();
    });
  }

  function refreshSelectionUI(items) {
    const selectedNames = new Set(selectedItems.map((item) => getEntryName(item)));
    const rows = fileArea.querySelectorAll("[data-fs-item]");

    rows.forEach((row) => {
      const nameNode = row.querySelector("[data-fs-item-name]");
      const rowName = nameNode?.dataset?.fsItemName || "";

      // Prefer names because renderFiles sorts entries before assigning row
      // indexes.  Fallback to the original index-based lookup for older rows
      // or custom callers that do not include a name node.
      let rowItem = rowName ? (items || []).find((item) => getEntryName(item) === rowName) : null;
      if (!rowItem) {
        const idx = Number(row.dataset.index);
        rowItem = items?.[idx] || null;
      }

      const isSelected = rowName
        ? selectedNames.has(rowName)
        : !!(rowItem && selectedItems.includes(rowItem));

      if (isSelected) row.setAttribute("data-selected", "true");
      else row.removeAttribute("data-selected");
      row.style.background = isSelected
        ? (isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff")
        : "";
    });
  }

  function handleSelection(e, item, items, index) {
    if (!items || index == null) return;

    // SHIFT = range selection
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const range = items.slice(start, end + 1);

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Shift → add range
        for (const it of range) {
          if (!selectedItems.includes(it)) {
            selectedItems.push(it);
          }
        }
      } else {
        // Shift only → replace selection
        selectedItems = range;
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd toggle
      const i = selectedItems.indexOf(item);
      if (i >= 0) selectedItems.splice(i, 1);
      else selectedItems.push(item);

      lastSelectedIndex = index;
    } else {
      // Single click
      selectedItems = [item];
      lastSelectedIndex = index;
    }

    selectedItem = item;
    refreshSelectionUI(items);
  }

  // ──────────────────────────────
  // RENDER FILES + MULTISELECT
  // ──────────────────────────────
  function truncateDisplayName(name, maxLen = 50) {
    const text = String(name ?? "");
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + "...";
  }

  function renderFiles() {
    fileArea.innerHTML = "";
    const items = currentEntries.slice().sort((a, b) => {
      const aFolder = isFolderEntry(a);
      const bFolder = isFolderEntry(b);
      if (aFolder !== bFolder) return aFolder ? -1 : 1;

      const direction = profile.sortOrder === "desc" ? -1 : 1;
      let aValue;
      let bValue;
      if (profile.sortMode === "size") {
        aValue = Number(a.size) || 0;
        bValue = Number(b.size) || 0;
      } else if (profile.sortMode === "date") {
        aValue = Number(a.mtime) || 0;
        bValue = Number(b.mtime) || 0;
      } else {
        aValue = getEntryName(a).toLowerCase();
        bValue = getEntryName(b).toLowerCase();
      }
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return getEntryName(a).localeCompare(getEntryName(b));
    });

    if (profile.displayMode === "tiles") {
      const grid = document.createElement("div");
      grid.style.display = "flex";
      grid.style.flexWrap = "wrap";
      grid.style.gap = "12px";
      grid.style.alignItems = "flex-start";
      grid.style.padding = "6px";

      items.forEach((item, index) => {
        const isFolder = isFolderEntry(item);
        const tile = document.createElement("div");
        tile.dataset.index = index;
        tile.dataset.fsItem = "true";
        tile.style.width = "140px";
        tile.style.minHeight = "140px";
        tile.style.maxHeight = "140px";
        tile.style.display = "flex";
        tile.style.flexDirection = "column";
        tile.style.alignItems = "center";
        tile.style.justifyContent = "flex-start";
        tile.style.padding = "10px";
        tile.style.border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eee";
        tile.style.borderRadius = "8px";
        tile.style.cursor = "pointer";
        tile.style.color = isDark ? "#e6eef8" : "#111";
        tile.style.background = isDark ? "rgba(255,255,255,0.02)" : "transparent";
        tile.style.overflow = "hidden";
        if (selectedItems.includes(item)) {
          tile.setAttribute('data-selected', 'true');
          tile.style.background = isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff";
        }

        tile.onclick = (e) => handleSelection(e, item, items, index);
        tile.ondblclick = async () => {
          if (isFolder) {
            selectedItems = [];
            currentPath.push(getEntryName(item));
            await refreshCurrentFolder();
          }
        };
        tile.oncontextmenu = (e) => { e.preventDefault(); if (selectedItems.length == 0) { handleSelection(e, item, items, index); } showContextMenu(e.clientX, e.clientY, isFolder); };

        const icon = document.createElement("div");
        icon.style.fontSize = "36px";
        icon.style.marginBottom = "8px";
        icon.appendChild(makeIcon(isFolder ? 'folder' : 'file', 36));
        tile.appendChild(icon);

        const name = document.createElement("div");
        name.dataset.fsItemName = getEntryName(item);
        name.textContent = truncateDisplayName(getEntryName(item));
        name.style.width = "100%";
        name.style.textAlign = "center";
        name.style.whiteSpace = "nowrap";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.marginBottom = "6px";
        tile.appendChild(name);

        const size = document.createElement("div");
        size.textContent = isFolder ? "--" : formatSize(item?.size);
        size.style.fontSize = "12px";
        size.style.opacity = "0.8";
        tile.appendChild(size);

        const date = document.createElement("div");
        date.textContent = formatDate(item?.mtime);
        date.style.fontSize = "12px";
        date.style.opacity = "0.8";
        tile.appendChild(date);

        grid.appendChild(tile);
      });

      fileArea.appendChild(grid);
    } else {
      items.forEach((item, index) => {
        const isFolder = isFolderEntry(item);
        const div = document.createElement("div");

        // Metadata
        div.dataset.index = index;
        div.dataset.isFolder = isFolder;
        div.dataset.fsItem = "true";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.maxWidth = "100%";
        div.style.padding = "6px";
        div.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eee";
        div.style.cursor = "pointer";
        div.style.color = isDark ? "#e6eef8" : "#111";
        if (!isFolder) {div.addEventListener('dblclick', () => alert('Open file by right clicking on the file and select the app you want to do so in Open With'));} // placeholder, will implement default opening soon

        // Highlight selected
        if (selectedItems.includes(item)) {
          div.setAttribute('data-selected', 'true');
          div.style.background = isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff";
        }

        // Click selection
        div.onclick = (e) => handleSelection(e, item, items, index);

        // Double-click folder open (or file open in text editor)
        div.ondblclick = async () => {
          if (isFolder) {
            selectedItems = [];
            currentPath.push(getEntryName(item));
            await refreshCurrentFolder();
          }
        };

        // Context menu
        div.oncontextmenu = (e) => {
          e.preventDefault();
          if (selectedItems.length == 0) {
            handleSelection(e, item, items, index);
          }
          selectedItem = item;
          showContextMenu(e.clientX, e.clientY, isFolder);
        };


        // Icon
        const icon = document.createElement("div");
        icon.style.width = "30px";
        icon.appendChild(makeIcon(isFolder ? 'folder' : 'file', 20));
        div.appendChild(icon);

        // Name
                            
                            
                             const nameDiv = document.createElement("div");
        nameDiv.dataset.fsItemName = getEntryName(item);
        nameDiv.textContent = truncateDisplayName(getEntryName(item));
        nameDiv.title = getEntryName(item);
        nameDiv.style.overflow = "hidden";
        nameDiv.style.whiteSpace = "nowrap";
        nameDiv.style.flex = "1";
        nameDiv.style.textOverflow = "ellipsis";
        div.appendChild(nameDiv);

        // Size
        const sizeDiv = document.createElement("div");
        sizeDiv.textContent = isFolder ? "--" : formatSize(item?.size);
        sizeDiv.style.width = "100px";
        sizeDiv.style.flexShrink = "0";
        sizeDiv.style.textAlign = "right";
        sizeDiv.style.color = "#555";
        div.appendChild(sizeDiv);

        // Date
              
              
              
              
              
              
              
              
              
              
        const dateDiv = document.createElement("div");
        dateDiv.textContent = formatDate(item?.mtime);
        dateDiv.style.minWidth = "180px";
        dateDiv.style.flexShrink = "0";
        dateDiv.style.textAlign = "right";
        dateDiv.style.color = "#555";
        dateDiv.style.paddingLeft = "12px";
        div.appendChild(dateDiv);

        fileArea.appendChild(div);
      });
    }
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
  }


  function scrollToSelected() {
    const selectedElement = fileArea.querySelector('[data-selected="true"]');
    if (selectedElement) {
      const elementTop = selectedElement.offsetTop;
      const elementHeight = selectedElement.offsetHeight;
      const containerHeight = fileArea.clientHeight;
      const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
      fileArea.scrollTop = Math.max(0, scrollPosition);
    }
  }

  function render(options = {}) {
    if (!initalized) return;
    renderBreadcrumbs();
    renderFiles();
    hideContextMenu();
    if (options.scroll) scrollToSelected();
    // Show Empty Trash button only when inside .trash
    const inTrash = currentPath.length >= 2 && currentPath[1] === ".trash";
    emptyTrashBtn.style.display = inTrash ? "flex" : "none";
  }

  // ──────────────────────────────
  // PERMANENT DELETE CONFIRM DIALOG
  // ──────────────────────────────
  function showPermanentDeleteDialog(itemCount, onConfirm) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.className = "misc";
    box.style.cssText =
      "padding:24px 28px;border-radius:10px;min-width:320px;max-width:420px;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,0.4);";

    const title = document.createElement("div");
    title.style.cssText = "display:flex;gap:8px;align-items:center;font-size:17px;font-weight:700;color:#c0392b;";
    const warnIcon = makeIcon('warning',18);
    const titleText = document.createElement('span');
    titleText.textContent = 'Permanently Delete';
    title.appendChild(warnIcon);
    title.appendChild(titleText);

    const desc = document.createElement("div");
    desc.style.fontSize = "13px";
    desc.innerHTML = `You are about to <strong>permanently delete ${itemCount} item${itemCount !== 1 ? "s" : ""}</strong>. This cannot be undone.<br><br>Type <strong>delete</strong> below to confirm:`;

    const input = document.createElement("input");
    input.placeholder = 'Type "delete" to confirm';
    input.style.cssText =
      "padding:7px 10px;width:100%;box-sizing:border-box;border:1px solid #c0392b;border-radius:5px;font-size:14px;outline:none;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "padding:6px 16px;border-radius:5px;cursor:pointer;";
    cancelBtn.onclick = () => {
      root.removeChild(overlay);
    };

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Delete Forever";
    confirmBtn.style.cssText =
      "padding:6px 16px;border-radius:5px;background:#c0392b;color:white;cursor:pointer;border:none;opacity:0.4;pointer-events:none;";
    confirmBtn.setAttribute("disabled", "true");

    input.oninput = () => {
      const valid = input.value.toLowerCase() === "delete";
      confirmBtn.style.opacity = valid ? "1" : "0.4";
      confirmBtn.style.pointerEvents = valid ? "" : "none";
      confirmBtn.disabled = !valid;
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter" && input.value.toLowerCase() === "delete") {
        root.removeChild(overlay);
        onConfirm();
      }
    };

    confirmBtn.onclick = () => {
      root.removeChild(overlay);
      onConfirm();
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    box.prepend(title);
    box.appendChild(desc);
    box.appendChild(input);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    root.appendChild(overlay);
    requestAnimationFrame(() => input.focus());
  }
  // --- CREATE FOLDER ---
  // --- PROPERTIES DIALOG ---
  async function showProperties(item) {
    if (!item) return;

    await withOperationStatus("Calculating properties...", async () => {
      const isFolder = isFolderEntry(item);
      const meta = item || {};

      function normalizeRootPath(path) {
        // Only normalize separators. Never trim whitespace: file and folder names
        // may consist entirely of spaces, including leading or trailing spaces.
        const normalized = String(path || "")
          .replace(/\\/g, "/")
          .replace(/^\/+/, "")
          .replace(/\/+$/, "");
        return normalized ? `/${normalized}` : "/";
      }

      function formatPropertiesValue(value) {
        const text = String(value ?? "");
        // Quoting boundary whitespace makes it unambiguous while keeping the
        // underlying path/name unchanged.
        if (/^\s/.test(text) || /\s$/.test(text)) return `"${text}"`;
        return text;
      }

      async function getDetailedFolderUsage(folderPath) {
        const rootPath = normalizeRootPath(folderPath);
        let size = 0;
        let sizeOnDisk = 4096;
        const entries = await window.protectedGlobals.ReadFolder(rootPath, {
          detail: true,
          directoryDetail: true,
        }).catch(() => []);

        for (const entry of entries) {
          size += entry.size;
          sizeOnDisk += entry.sizeOnDisk;
        }

        return { size, sizeOnDisk };
      }

      const rawItemPath = getEntryPath(item);
      const itemPath = normalizeRootPath(rawItemPath);
      const folderUsage = isFolder ? await getDetailedFolderUsage(itemPath) : null;

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.35);z-index:9500;display:flex;align-items:center;justify-content:center;";

      const box = document.createElement("div");
      box.className = "misc";
      box.style.cssText = "padding:18px 20px;border-radius:8px;min-width:320px;max-width:520px;display:flex;flex-direction:column;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.35);";
      if (window.protectedGlobals.data.dark) {
        box.style.background = "#0b0b0b";
        box.style.color = "#e6eef8";
      } else {
        box.style.background = "white";
        box.style.color = "#111";
      }

      const title = document.createElement("div");
      title.textContent = "Properties";
      title.style.fontSize = "16px";
      title.style.fontWeight = "700";

      const addRow = (label, value) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.gap = "12px";
        const lab = document.createElement("div");
        lab.textContent = label;
        lab.style.opacity = "0.85";
        const val = document.createElement("div");
        val.textContent = formatPropertiesValue(value);
        val.title = String(value ?? "");
        val.style.opacity = "0.9";
        val.style.textAlign = "right";
        val.style.whiteSpace = "pre-wrap";
        val.style.overflowWrap = "anywhere";
        val.style.wordBreak = "break-word";
        val.style.maxWidth = "70%";
        row.appendChild(lab);
        row.appendChild(val);
        box.appendChild(row);
      };

      addRow("Name", getEntryName(item));
      addRow("Type", isFolder ? "Folder" : "File");
      addRow("Size", isFolder ? formatSize(folderUsage.size) : formatSize(meta.size));
      addRow("Size on disk", isFolder
        ? formatSize(folderUsage.sizeOnDisk)
        : formatSize(meta.sizeOnDisk ?? getEntryOnDiskSize(meta.size || 0)));
      addRow("Modified", formatDate(meta.mtime));
      addRow("Path", itemPath);

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.justifyContent = "flex-end";

      const ok = document.createElement("button");
      ok.textContent = "OK";
      ok.style.padding = "6px 12px";
      ok.onclick = () => {
        if (root.contains(overlay)) root.removeChild(overlay);
      };

      btnRow.appendChild(ok);
      box.prepend(title);
      box.appendChild(btnRow);
      overlay.appendChild(box);

      overlay.addEventListener("pointerdown", (e) => {
        if (e.target === overlay) {
          if (root.contains(overlay)) root.removeChild(overlay);
        }
      });

      root.appendChild(overlay);
      requestAnimationFrame(() => ok.focus());
    }, "Properties loaded.");
  }
  function getUniqueName(nameOrBase, ext = "", existingChildren, reservedNames = null) {
    const children = Array.isArray(existingChildren) ? existingChildren : currentEntries;

    let base = nameOrBase;
    let extension = ext || "";
    if (!extension) {
      const idx = nameOrBase.lastIndexOf(".");
      if (idx > 0) {
        base = nameOrBase.slice(0, idx);
        extension = nameOrBase.slice(idx);
      }
    } else if (!extension.startsWith(".")) {
      extension = "." + extension;
    }

    const names = new Set();
    for (const child of children) {
      const name = typeof child === "string" ? child : getEntryName(child);
      if (name) names.add(name);
    }
    if (reservedNames instanceof Set) {
      for (const name of reservedNames) {
        if (name) names.add(String(name));
      }
    } else if (Array.isArray(reservedNames)) {
      for (const name of reservedNames) {
        if (name) names.add(String(name));
      }
    }

    const leadMatch = base.match(/^\((\d+)\)\s*(.*)$/);
    const originalName = leadMatch ? `${base}${extension}` : `${base}${extension}`;

    if (!names.has(originalName)) {
      return originalName;
    }

    const compareName = leadMatch
      ? `${leadMatch[2] || ""}${extension}`
      : originalName;

    let found = false;
    let maxNum = -Infinity;

    if (names.has(compareName)) {
      found = true;
      maxNum = Math.max(maxNum, 0);
    }

    for (const name of names) {
      const m = name.match(/^\((\d+)\)\s*(.*)$/);
      if (m && m[2] === compareName) {
        found = true;
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
      }
    }

    if (!found) return originalName;
    return `(${maxNum + 1}) ${compareName}`;
  }
  async function createFolder() {
    await withOperationStatus("Creating folder...", async () => {
      const folderName = getUniqueName("New Folder");
      const parentPath = getCurrentFolderApiPath();
      const result = await window.protectedGlobals.WriteFolder(
        parentPath === "/" ? folderName : `${parentPath}/${folderName}`,
      ).catch((error) => ({ error: String(error) }));
      if (result?.error || result?.success === false) {
        const error = new Error(result.error || "Could not create folder");
        error.result = result;
        throw error;
      }
      await refreshCurrentFolder();
      selectEntriesByNames([folderName]);
      return result;
    }, "Folder created.").catch(() => {});
  }

  async function createFile() {
    await withOperationStatus("Creating file...", async () => {
      const fileName = getUniqueName("New File.txt");
      const parentPath = getCurrentFolderApiPath();
      const filePath = parentPath === "/" ? fileName : `${parentPath}/${fileName}`;
      const result = await window.protectedGlobals.WriteFile(filePath, "", { replace: true, text: true }).catch((error) => ({ error: String(error) }));
      if (result?.error || result?.success === false) {
        const error = new Error(result.error || "Could not create file");
        error.result = result;
        throw error;
      }
      await refreshCurrentFolder();
      selectEntriesByNames([fileName]);
      return result;
    }, "File created.").catch(() => {});
  }

  // --- ADD BUTTONS ---
  createFolderBtn = document.createElement("button");
  createFolderBtn.textContent = "+ Folder";
  createFolderBtn.onclick = createFolder;
  styleSidebarButton(createFolderBtn);
  sidebar.appendChild(createFolderBtn);

  createFileBtn = document.createElement("button");
  createFileBtn.textContent = "+ File";
  createFileBtn.onclick = createFile;
  styleSidebarButton(createFileBtn);
  sidebar.appendChild(createFileBtn);

  // Storage usage display
  storageDiv = document.createElement("div");
  storageDiv.style.marginTop = "8px";
  storageDiv.style.fontSize = "13px";
  storageDiv.style.color = isDark ? "#cbd5e1" : "#334155";
  storageDiv.textContent = "Storage used: —";
  sidebar.appendChild(storageDiv);

  // below storage display, add a status message area for status
  statusDiv = document.createElement("div");
  statusDiv.style.marginTop = "6px";
  statusDiv.style.fontSize = "16px";
  statusDiv.style.color = isDark ? "#cbd5e1" : "#334155";
  statusDiv.textContent = "All Files Loaded.";
  sidebar.appendChild(statusDiv);

  // Centralized status tracking helpers
  let activeStatusOperations = 0;

  function setOperationStatus(text) {
    if (statusDiv) statusDiv.textContent = text;
  }

  function beginOperationStatus(text) {
    activeStatusOperations += 1;
    setOperationStatus(text);
  }

  function endOperationStatus(text = "All Files Loaded.") {
    activeStatusOperations = Math.max(0, activeStatusOperations - 1);
    if (activeStatusOperations === 0) setOperationStatus(text);
  }

  async function withOperationStatus(text, operation, successText = "All Files Loaded.", options = {}) {
    beginOperationStatus(text);
    try {
      const result = await operation();
      endOperationStatus(successText);
      return result;
    } catch (error) {
      if (isOutOfStorageError(error?.result || error?.body || error)) {
        endOperationStatus("Storage Exceeded.");
      } else {
        endOperationStatus(error);
      }
      throw error;
    } finally {
      if (!options.noUpdate) {
        updateStorageDisplay();
      }
    }
  }

  applyExplorerTheme();
  // Client-side quota (bytes). Prefer server-provided `window.protectedGlobals.data.maxSpace` (GB) if available.
  const maxSpaceGb = Number(window.protectedGlobals.data.maxSpace);
  const STORAGE_QUOTA_BYTES =
    Number.isFinite(maxSpaceGb) && maxSpaceGb > 0
      ? maxSpaceGb * 1024 * 1024 * 1024
      : 1 * 1024 * 1024 * 1024; // fallback 1 GB
  // Deselect when clicking outside file items
  root.addEventListener("click", (e) => {
    // Ignore clicks inside the context menu
    if (contextMenu.contains(e.target)) return;

    // Check if the click is inside any file/folder div
    const isClickInsideFile = e.target?.closest?.('[data-fs-item="true"]');
    if (!isClickInsideFile && selectedItems.length > 0) {
      selectedItems = [];
      selectedItem = null;

      refreshSelectionUI(currentEntries);
    }

    const tag = String((e.target && e.target.tagName) || "").toUpperCase();
    const keepNativeFocus =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      !!(e.target && e.target.isContentEditable);
    if (!keepNativeFocus) {
      try {
        root.focus();
      } catch (err) {}
    }
  });
  let handlepaste = async (e) => {
    if (e !== "cmp") {
      if (!e || !e.target || !root.contains(e.target)) return;
      if (e.repeat) return;
    }

    if ((e.ctrlKey && e.key.toLowerCase() === "v") || e == "cmp") {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();

      const isCut = window.explorerGlobals.clipboardMode === "cut";
      if (!window.explorerGlobals.clipboard.length) {
        setOperationStatus("Clipboard is empty.");
        return;
      }
      await withOperationStatus(isCut ? "Moving files..." : "Pasting files...", async () => {
        const reservedNames = new Set(currentEntries.map((entry) => getEntryName(entry)).filter(Boolean));
        const pastedNames = [];
        let allMoved = isCut;
        try {
          for (const item of window.explorerGlobals.clipboard) {
            const sourceFullPath = String(item.path || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
            const sourceName = item.name || sourceFullPath.split("/").pop();

            // Cutting and pasting in the source folder is a no-op.
            if (isCut) {
              const sameFolderPath = getCurrentFolderApiPath() === "/"
                ? sourceName
                : `${getCurrentFolderApiPath()}/${sourceName}`;
              if (sourceFullPath === sameFolderPath.replace(/^\/+|\/+$/g, "")) {
                pastedNames.push(sourceName);
                continue;
              }
            }

            const destinationName = getUniqueName(sourceName, "", currentEntries, reservedNames);
            reservedNames.add(destinationName);
            const destinationFullPath = getCurrentFolderApiPath() === "/"
              ? destinationName
              : `${getCurrentFolderApiPath()}/${destinationName}`;

            if (item.isFolder) {
              const result = await window.protectedGlobals.PasteFolder(destinationFullPath, { path: sourceFullPath, type: "folder" }, { move: isCut });
              if (result?.error || result?.success === false) {
                const error = new Error(result.error || "Could not paste folder");
                error.result = result;
                throw error;
              }
            } else {
              const result = await window.protectedGlobals.PasteFile(destinationFullPath, { path: sourceFullPath, type: "file" }, { move: isCut });
              if (result?.error || result?.success === false) {
                const error = new Error(result.error || "Could not paste file");
                error.result = result;
                throw error;
              }
            }
            pastedNames.push(destinationName);
          }

          if (isCut) {
            window.explorerGlobals.clipboard = [];
            window.explorerGlobals.clipboardMode = "copy";
          }
        } finally {
          await refreshCurrentFolder();
          if (pastedNames.length) selectEntriesByNames(pastedNames);
        }
      }, isCut ? "Move complete." : "Paste complete.").catch(() => null);
    }
  };
  let handlecopy = (e) => {
    if (e !== "copy") {
      if (!e || !e.target || !root.contains(e.target)) return;
      if (e.repeat) return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === "c") || e == "copy") {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      window.explorerGlobals.clipboard = selectedItems.map((item) => ({
        node: item,
        path: getEntryPath(item),
        name: getEntryName(item),
        isFolder: isFolderEntry(item)
      }));
      window.explorerGlobals.clipboardMode = "copy";
    }
  };
  let handlecut = (e) => {
    if (e !== "cut") {
      if (!e || !e.target || !root.contains(e.target)) return;
      if (e.repeat) return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === "x") || e == "cut") {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      window.explorerGlobals.clipboard = selectedItems.map((item) => ({
        node: item,
        path: getEntryPath(item),
        name: getEntryName(item),
        isFolder: isFolderEntry(item)
      }));
      window.explorerGlobals.clipboardMode = "cut";
    }
  };
  root.addEventListener("keydown", handlepaste);
  root.addEventListener("keydown", handlecopy);
  root.addEventListener("keydown", handlecut);

  // --- SELECT ALL (Ctrl+A) ---
  let handleSelectAll = (e) => {
    if (!e || !e.target || !root.contains(e.target)) return;
    if (e.repeat) return;
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      e.stopPropagation();
      const items = currentEntries.slice();
      selectedItems = items.slice();
      lastSelectedIndex = items.length - 1;
      refreshSelectionUI(items);
    }
  };
  root.addEventListener("keydown", handleSelectAll);

  // --- CONTEXT MENU ---
  function showContextMenu(clientX, clientY, isFolder, isBlank = false) {
    contextMenu.innerHTML = "";
    const containerRect = container.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    
    let x = clientX - containerRect.left;
    let y = clientY - containerRect.top;

    // Wait for context menu to render before checking its size
    requestAnimationFrame(() => {
      const menuWidth = contextMenu.offsetWidth || 260;
      const menuHeight = contextMenu.offsetHeight || 400;
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Adjust X position if menu would overflow to the right
      if (x + menuWidth > containerWidth) {
        x = Math.max(0, containerWidth - menuWidth - 5);
      }

      // Adjust Y position if menu would overflow to the bottom
      if (y + menuHeight > containerHeight) {
        y = Math.max(0, containerHeight - menuHeight - 5);
      }

      // Ensure minimum padding from edges
      x = Math.max(5, x);
      y = Math.max(5, y);

      contextMenu.style.left = x + "px";
      contextMenu.style.top = y + "px";
    });
    const addItem = (label, action, disabled = false) => {
      const div = document.createElement("div");
      div.textContent = label;
      div.style.padding = "4px 8px";
      div.style.cursor = disabled ? "not-allowed" : "pointer";
      div.style.userSelect = "none";
      div.style.borderRadius = "7px";
      div.style.margin = "1px 1px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "space-between";
      div.style.minHeight = "24px";
      div.style.background = "transparent";
      div.style.color = "inherit";
      div.style.fontSize = "92%";
      if (disabled) {
        div.style.opacity = "0.55";
      } else {
        const hoverBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
        div.addEventListener('mouseenter', () => (div.style.background = hoverBg));
        div.addEventListener('mouseleave', () => (div.style.background = 'transparent'));
        div.addEventListener('click', () => {
          hideContextMenu();
          try { action(); } catch(e) { console.error(e); }
        });
      }

      contextMenu.appendChild(div);
    };

    // ──────────────
    // MULTI-SELECT LOGIC
    // ──────────────
    const isMulti = selectedItems.length > 1;

    // Blank area menu items (Select All, New File, New Folder)
    if (isBlank) {
      addItem("Select All", () => {
        const items = currentEntries.slice();
        selectedItems = items.slice();
        lastSelectedIndex = items.length - 1;
        refreshSelectionUI(items);
      });

      addItem("New File", () => {
        createFile();
      });

      addItem("New Folder", () => {
        createFolder();
      });
    }

    // Delete (works for single or multi)
    // ──────────────────────────────
    // CONTEXT MENU ITEMS
    // ──────────────────────────────

    // Detect whether we are inside .trash
    const inTrash = currentPath.length >= 2 && currentPath[1] === ".trash";

    // Delete / Delete Permanently for multi-select
    if (!isBlank && selectedItems.length) {
      if (inTrash) {
        addItem("Delete Permanently", () => {
          showPermanentDeleteDialog(selectedItems.length, async () => {
            await withOperationStatus("Deleting permanently...", async () => {
              for (const item of selectedItems) {
                const itemPath = `${getCurrentFolderApiPath() === "/" ? "" : getCurrentFolderApiPath() + "/"}${getEntryName(item)}`;
                const result = await window.protectedGlobals.DeleteFile(itemPath, { permanent: true }).catch(() => null);
                if (result?.error || result?.success === false) {
                  const error = new Error(result.error || "Could not permanently delete item");
                  error.result = result;
                  selectedItems = [];
                  selectedItem = null;
                  await refreshCurrentFolder();
                  throw error;
                }
              }
              selectedItems = [];
              selectedItem = null;
              await refreshCurrentFolder();
            }, "Permanent delete complete.").catch(() => null);
          });
        });

        addItem("Restore", async () => {
          await withOperationStatus("Restoring files...", async () => {
            const rootEntries = normalizeReadFolderEntries(await window.protectedGlobals.ReadFolder("/", {
              detail: true,
              directoryDetail: false,
            }).catch(() => []));
            const reservedNames = new Set(rootEntries.map((entry) => getEntryName(entry)).filter(Boolean));
            for (const item of selectedItems) {
              const result = await window.protectedGlobals.filePost({
                saveSnapshot: true,
                directions: [{ path: getEntryPath(item), restore: true }]
              })
              if (result?.error || result?.success === false) {
                const error = new Error(result.error || "Could not restore item");
                error.result = result;
                selectedItems = [];
                selectedItem = null;
                await refreshCurrentFolder();
                throw error;
              }
            }
            selectedItems = [];
            selectedItem = null;
            await refreshCurrentFolder();
          }, "Restore complete.").catch(() => null);
        });
      } else {
        addItem("Delete", async () => {
          await withOperationStatus("Deleting files...", async () => {
            for (const item of selectedItems) {
              const itemPath = getCurrentFolderApiPath() === "/"
                ? getEntryName(item)
                : `${getCurrentFolderApiPath()}/${getEntryName(item)}`;
              const result = await (isFolderEntry(item)
                ? window.protectedGlobals.DeleteFolder(itemPath, { permanent: false })
                : window.protectedGlobals.DeleteFile(itemPath, { permanent: false })).catch(() => null);
              if (result?.error || result?.success === false) {
                const error = new Error(result.error || "Could not delete item");
                error.result = result;
                selectedItems = [];
                selectedItem = null;
                await refreshCurrentFolder();
                throw error;
              }
            }
            selectedItems = [];
            selectedItem = null;
            await refreshCurrentFolder();
          }, "Delete complete.").catch(() => null);
        });
      }
    }

    // Rename only if single item is selected
    if (!isBlank && selectedItem && selectedItems.length <= 1) {
      if(isFolder) {
      addItem("Open in Terminal", () => {
        const path = getEntryPath(selectedItem);
        if (path) {
          window.terminal(path);
        }
      });
      }
      addItem("Create Shortcut", () => {
        const filePath = getEntryPath(selectedItem);
        if (!filePath) return;
        const itemPath = String(filePath).replace(/^\//, "").replace(/^$/, "/");
        const record = {
          type: isFolder ? "folder" : "file",
          label: getEntryName(selectedItem),
          name: getEntryName(selectedItem),
          path: itemPath.startsWith("/") ? itemPath : `/${itemPath}`
        };
        window.protectedGlobals.createDesktopShortcut(record);
      });
      addItem("Rename", () => {
        const oldName = getEntryName(selectedItem);

        const row = Array.from(fileArea.querySelectorAll('[data-fs-item]')).find((el) => {
          const directMatch = el.dataset.fsItemName === oldName;
          if (directMatch) return true;
          return Array.from(el.querySelectorAll('[data-fs-item-name]')).some(
            (node) => node.dataset.fsItemName === oldName,
          );
        });
        if (!row) return;

        const nameDiv =
          row.dataset.fsItemName === oldName
            ? row
            : row.querySelector(`[data-fs-item-name="${CSS.escape(String(oldName))}"]`) ||
              Array.from(row.querySelectorAll('[data-fs-item-name]')).find(
                (node) => node.dataset.fsItemName === oldName,
              );
        if (!nameDiv) return;

        const input = document.createElement("input");
        input.value = oldName;
        input.style.width = "100%";
        nameDiv.textContent = "";
        nameDiv.appendChild(input);
        input.focus();
        input.select();
        let newName;
        const finish = async () => {
          newName = input.value;
          if (!newName || newName === oldName) {
            render();
            return;
          }

          await withOperationStatus("Renaming...", async () => {
            // Ensure new name is unique among current directory entries.
            for (const entry of currentEntries) {
              if (entry !== selectedItem && getEntryName(entry) === newName) {
                newName = getUniqueName(newName, "", currentEntries);
                break;
              }
            }

            const oldPath = getCurrentFolderApiPath() === "/"
              ? oldName
              : `${getCurrentFolderApiPath()}/${oldName}`;
            const result = await (isFolder
              ? window.protectedGlobals.RenameFolder(oldPath, newName)
              : window.protectedGlobals.RenameFile(oldPath, newName));

            if (result?.error || result?.success === false) {
              const error = new Error(result.error || "Could not rename item");
              error.result = result;
              throw error;
            }

            await refreshCurrentFolder();
            // selectEntriesByNames checks whether the predicted name is really
            // available in the refreshed folder before applying selection.
            selectEntriesByNames([newName]);
          }, "Rename complete.").catch(() => null);
        };

        input.onblur = finish;
        input.onkeydown = (e) => {
          if (e.key === "Enter") root.focus(); // trigger blur to finish
          if (e.key === "Escape") {
            input.onblur = null; // prevent triggering finish
            render();
          }
        };
      });
    }

      // Properties menu item for single selection
      if (!isBlank && selectedItem && selectedItems.length <= 1) {
        addItem("Properties", () => {
          try { showProperties(selectedItem); } catch (e) { console.error(e); }
        });
      }

    // Copy / Cut (works for multi-select)
    if (!isBlank && selectedItems.length) {
      addItem("Copy", () => handlecopy("copy"));
      addItem("Cut", () => handlecut("cut"));
    }

    if (isBlank && window.explorerGlobals.clipboard.length) {
      addItem("Paste", () => handlepaste("cmp"));
    }

    // "Open with" submenu for files (always show Text Editor option)
    if (!isFolder && !isBlank) {
      const openWithParent = document.createElement("div");
      openWithParent.style.display = "flex";
      openWithParent.style.alignItems = "center";
      openWithParent.style.justifyContent = "space-between";
      const openLabel = document.createElement('span');
      openLabel.textContent = 'Open with';
      openLabel.style.marginRight = '8px';
      openLabel.style.fontSize = '92%';
      openWithParent.appendChild(openLabel);
      openWithParent.appendChild(makeIcon('chev',12));
      openWithParent.style.padding = "4px 8px";
      openWithParent.style.margin = "1px 1px";
      openWithParent.style.borderRadius = "7px";
      openWithParent.style.minHeight = "24px";
      openWithParent.style.cursor = "pointer";
      openWithParent.style.background = "transparent";
      openWithParent.style.color = "inherit";
      openWithParent.addEventListener('mouseenter', () => {
        openWithParent.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
      });
      openWithParent.addEventListener('mouseleave', () => {
        openWithParent.style.background = 'transparent';
      });

      let submenu;
      openWithParent.addEventListener("mouseenter", () => {
        if (submenu) return; // already open
        // Create submenu positioned to the right of the main menu
        submenu = document.createElement("div");
        submenu.style.position = "absolute";
        submenu.style.border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
        submenu.style.background = isDark ? "#111827" : "#ffffff";
        submenu.style.color = isDark ? "#e6eef8" : "#111";
        submenu.style.zIndex = 2000;
        submenu.style.borderRadius = "10px";
        submenu.style.boxShadow = isDark ? "0 12px 32px rgba(0,0,0,0.55)" : "0 10px 24px rgba(0,0,0,0.12)";
        submenu.style.padding = "6px";
        submenu.style.minWidth = "170px";
        const toOpen = selectedItems.length ? selectedItems.slice() : [selectedItem];
        const selectedExtensions = toOpen
          .filter((node) => node && !isFolderEntry(node))
          .map((node) => {
            const candidatePath = getEntryPath(node);
            return String(candidatePath || "");
          })
          .map((path) => {
            const fileName = String(path).split("/").pop() || "";
            const dotIndex = fileName.lastIndexOf(".");
            return dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";
          });

        function normalizeOpenFileCapability(value) {
          if (Array.isArray(value)) {
            return value
              .map((v) => String(v || "").toLowerCase())
              .filter(Boolean);
          }
          if (typeof value === "string") {
            return value
              .split(",")
              .map((v) => String(v || "").toLowerCase())
              .filter(Boolean);
          }
          return [];
        }

        function normalizeProtectedPath(value) {
          const raw = String(value || "").replace(/\\/g, "/");
          return raw.startsWith("/") ? raw : `/${raw}`;
        }

        function isProtectedKeyFilePath(filePath) {
          const normalized = normalizeProtectedPath(filePath).toLowerCase();
          if (normalized === "/systemfiles/userprofile/jsapikey.txt") return true;
          return /^\/systemfiles\/runtime\/apps\/[^/]+\/jskey\.txt$/i.test(normalized);
        }

        function appCanOpenSelectedFiles(app) {
          const selectedPaths = toOpen
            .filter((node) => node && !isFolderEntry(node))
            .map((node) => getEntryPath(node));

          const containsProtectedFile = selectedPaths.some((path) => isProtectedKeyFilePath(path));
          if (containsProtectedFile) {
            return app.requestAdminPerm === true;
          }
          return true;
        }

        function appSupportsSelectedExtensions(app) {
          const caps = normalizeOpenFileCapability(app.openfileCapability);
          if (!caps.length) return false;
          if (caps.includes("*")) return true;
          if (!selectedExtensions.length) return false;
          return selectedExtensions.every((ext) => caps.includes(ext));
        }

        const apps = window.protectedGlobals.apps
          .map((app) => {
            const functionName = app && (app.functionName || app.id);
            if (!functionName || !(window[functionName])) return null;
            return {
              label: app.label || functionName,
              functionName,
              openfileCapability: app.openfileCapability,
              requestAdminPerm: app.requestAdminPerm === true,
            };
          })
          .filter(Boolean)
          .filter((app) => {
            const ownId = String(root.dataset.appId || "").toLowerCase();
            return String(app.functionName || "").toLowerCase() !== ownId;
          })
          .filter((app) => appCanOpenSelectedFiles(app))
          .filter((app) => appSupportsSelectedExtensions(app));

        if (!apps.length) {
          const emptyItem = document.createElement("div");
          emptyItem.textContent = "No apps available";
          emptyItem.style.padding = "8px 10px";
          emptyItem.style.opacity = "0.7";
          emptyItem.style.cursor = "default";
          emptyItem.style.borderRadius = "8px";
          emptyItem.style.fontSize = "92%";
          submenu.appendChild(emptyItem);
        } else {
          for (const app of apps) {
            const appItem = document.createElement("div");
            appItem.textContent = app.label;
            appItem.style.padding = "8px 10px";
            appItem.style.cursor = "pointer";
            appItem.style.borderRadius = "8px";
            appItem.style.margin = "2px 0";
            appItem.style.fontSize = "92%";
            appItem.style.background = "transparent";
            appItem.addEventListener('mouseenter', () => {
              appItem.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
            });
            appItem.addEventListener('mouseleave', () => {
              appItem.style.background = 'transparent';
            });
            appItem.onclick = async () => {
              try {
                // 2nd layer protection, can be removed
                const blockedByKeyProtection = toOpen.some((node) => {
                  if (!node || isFolderEntry(node)) return false;
                  return isProtectedKeyFilePath(getEntryPath(node));
                });
                if (blockedByKeyProtection && app.requestAdminPerm !== true) {
                  console.warn("Blocked app from opening protected key file without admin permission:", app.functionName);
                  return;
                }

                hideContextMenu();
                for (const node of toOpen) {
                  if (!node || isFolderEntry(node)) continue;
                  let path = getEntryPath(node);
                  console.log("Opening with app", app.functionName, path, node);
                  try {
                    const adminkey = await window.protectedGlobals.ReadFile('/systemfiles/userprofile/jsApiKey.txt', { text: true, direct: true });
                    window.protectedGlobals.changeCursorToWait();
                    try {
                      if (!app.requestAdminPerm) {
                        await window[app.functionName](path, adminkey);
                      } else {
                        await window[app.functionName](path);
                      }
                    } catch {}
                    finally {
                      window.protectedGlobals.changeCursorToDefault();
                    }
                  } catch (e) {
                    console.error("open with app error", e);
                  }
                }
              } catch (e) {
                console.error(e);
              }
            };
            submenu.appendChild(appItem);
          }
        }
        // append to `root` so positioning is relative to the explorer window
        root.appendChild(submenu);

        // Position the submenu relative to `root` and keep it inside the window
        requestAnimationFrame(() => {
          try {
            const parentRect = openWithParent.getBoundingClientRect();
            const menuRect = contextMenu.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();

            // Compute coordinates relative to root's top-left
            let left = menuRect.right - rootRect.left;
            let top = parentRect.top - rootRect.top;

            const sh = submenu.offsetHeight || 0;
            const rw = rootRect.width || root.clientWidth;
            const rh = rootRect.height || root.clientHeight;

            // Keep submenu inside root horizontally
            if (left + submenu.offsetWidth > rw - 8) {
              // position to the left of the main menu if it would overflow
              const altLeft =
                menuRect.left - rootRect.left - submenu.offsetWidth;
              if (altLeft > 8) left = altLeft;
            }

            // If submenu would go off bottom of root, move it up
            if (top + sh > rh - 8) {
              top = Math.max(8, rh - sh - 8);
            }

            submenu.style.left = left + "px";
            submenu.style.top = top + "px";
            submenu.onclick = (e) => {
              setTimeout(() => {
                if (submenu) {
                  submenu.remove();
                  submenu = null;
                }
              }, 10);
            };
          } catch (e) {}
        });
      });

      document.addEventListener(
        "pointerdown",
        (e) => {
          if (submenu && !submenu.contains(e.target)) {
            submenu.remove();
            submenu = null;
          }
        },
        { capture: true, once: true },
      );

      contextMenu.appendChild(openWithParent);
    }
    if (contextMenu.children.length === 0) {contextMenu.style.display = "none"; return;} // don't show empty menu
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.style.display = "block";
  }

  function hideContextMenu() {
    contextMenu.style.display = "none";
  }
  document.addEventListener("fileExplorer" + root._goldenbodyId, "click", hideContextMenu);

  // --- BUTTONS ---
  refreshBtn.onclick = async () => {
    refreshBtn.innerHTML = '';
    refreshBtn.appendChild(makeIcon('refresh',16));
    refreshBtn.appendChild(document.createTextNode('Refreshing...'));
    statusDiv.textContent = "Fetching Newest Files...";
    await refreshCurrentFolder();
    refreshBtn.innerHTML = '';
    refreshBtn.appendChild(makeIcon('refresh',16));
    refreshBtn.appendChild(document.createTextNode('Refresh'));
  };
  uploadBtn.onclick = () => fileInput.click();
  homeBtn.onclick = async () => {
    currentPath = ["/"];
    await refreshCurrentFolder();
  };
  trashBtn.onclick = async () => {
    currentPath = ["/", ".trash"];
    await refreshCurrentFolder();
  };
  emptyTrashBtn.onclick = () => {
    const trashItems = currentEntries.slice();
    const count = trashItems.length;
    if (!count) return;
    showPermanentDeleteDialog(count, async () => {
      await withOperationStatus("Emptying trash...", async () => {
        for (const item of trashItems) {
          const result = await window.protectedGlobals.DeleteFile(`.trash/${getEntryName(item)}`, { permanent: true }).catch(() => null);
          if (result?.error || result?.success === false) {
            const error = new Error(result.error || "Could not delete item");
            error.result = result;
            selectedItems = [];
            selectedItem = null;
            await refreshCurrentFolder();
            throw error;
          }
        }
        await refreshCurrentFolder();
      }, "Trash emptied.").catch(() => null);
    });
  };

  // --- Upload helpers ---
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB chunks for visible progress

  fileInput.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    if (!Array.isArray(currentEntries)) return;

    const allowed = files.slice();

    if (!allowed.length) {
      e.target.value = "";
      return;
    }

    const totalBytes = allowed.reduce((sum, file) => sum + file.size, 0);
    let uploadedBytes = 0;
    let uploadFailed = false;
    let outOfStorage = false;
    const uploadSessionId = showUploadProgress(
      `Uploading ${allowed.length} file${allowed.length === 1 ? "" : "s"}`,
      `0/${allowed.length} ready`,
      totalBytes,
    );

    try {
      const reservedNames = new Set(currentEntries.map((entry) => getEntryName(entry)).filter(Boolean));
      const uploadedNames = [];
      for (let fileIndex = 0; fileIndex < allowed.length; fileIndex++) {
        const f = allowed[fileIndex];
        const newName = getUniqueName(f.name, "", currentEntries, reservedNames);
        reservedNames.add(newName);
        const cp = getCurrentFolderApiPath();
        const destinationPath = cp === "/" ? newName : `${cp}/${newName}`;
        const fileLabel = `${fileIndex + 1}/${allowed.length}: ${newName}`;

        try {
          if (f.size === 0) {
            const result = await window.protectedGlobals.WriteFile(destinationPath, new Uint8Array(0), { replace: true });
            if (result?.error || result?.success === false) throw result;
            uploadedBytes += f.size;
            updateUploadProgress(uploadedBytes, `Uploaded ${fileLabel}`, uploadSessionId);
            uploadedNames.push(newName);
            continue;
          }

          const total = Math.ceil(f.size / CHUNK_SIZE);
          for (let i = 0; i < total; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(f.size, start + CHUNK_SIZE);
            const chunk = f.slice(start, end);
            const chunkBytes = end - start;
            let progressLabel = '';

            if (i > 1) {
              progressLabel = `Uploading ${fileLabel} (${i + 1}/${total} chunks)`;
            } else {
              progressLabel = `Uploading ${fileLabel} (${i + 1}/${total} chunks) (The 1st chunk may take longer to upload)`;
            }

            updateUploadProgress(uploadedBytes, progressLabel, uploadSessionId);
            const result = await window.protectedGlobals.WriteFile(destinationPath, chunk, { replace: i === 0 });
            if (result?.error || result?.success === false) throw result;
            uploadedBytes += chunkBytes;
            updateUploadProgress(uploadedBytes, `Uploaded ${fileLabel}`, uploadSessionId);
          }
          uploadedNames.push(newName);
        } catch (err) {
          console.error(`Failed to upload ${newName}:`, err);
          outOfStorage = isOutOfStorageError(err);
          if (outOfStorage) {
            setUploadError("Storage Exceeded", "Storage Exceeded: cannot upload this file", uploadSessionId);
            setOperationStatus("Storage Exceeded.");
          } else {
            setUploadError("Upload failed", `Failed to upload ${newName}`, uploadSessionId);
            setOperationStatus(`Upload failed: ${newName}`);
          }
          uploadFailed = true;
          break;
        }
      }

      if (!uploadFailed) {
        uploadState.activeSessions.delete(uploadSessionId);
        if (uploadState.activeSessions.size > 0) {
          return;
        }
        hideUploadProgress(900, uploadSessionId);
      }
    } catch (err) {
      console.error("upload failed", err);
      uploadFailed = true;
      outOfStorage = isOutOfStorageError(err);
      setUploadError(
        outOfStorage ? "Storage Exceeded" : "Upload failed",
        outOfStorage ? "Storage Exceeded: cannot upload this file" : "Upload failed",
        uploadSessionId,
      );
      setOperationStatus(outOfStorage ? "Storage Exceeded." : "Upload failed.");
    } finally {
      e.target.value = "";
      await refreshCurrentFolder();
      selectEntriesByNames(uploadedNames);
      await updateStorageDisplay();
      endOperationStatus(outOfStorage ? "Storage Exceeded." : (uploadFailed ? "Upload failed." : "Upload complete."));
    }
  });
  const handleStyleApplied = () => {
    applyExplorerTheme();
    try {
      render();
    } catch (e) {
      console.warn("fileExplorer styleapplied refresh failed", e);
    }
  };
  root.addEventListener("styleapplied", handleStyleApplied);

  // --- INIT ---
  statusDiv.textContent = "Loading...";
  onlyLoadFolder(path);

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
    goldenbodyId: window.explorerGlobals.goldenbodyId,
  };
};