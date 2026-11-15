"use strict";
// global const/let is banned in non (()=>{})() wrappers
(async function () {
window.protectedGlobals.css = await window.protectedGlobals.ReadFile("systemfiles/runtime/core/stuff.css", {text: true, direct: true});
const styleTag = window.protectedGlobals.styleTag = document.createElement("style");
styleTag.textContent = window.protectedGlobals.css;
document.head.appendChild(styleTag);
window.protectedGlobals.renderAppsGrid = async function () {
  if (!window.protectedGlobals._startMenuConfig) await window.protectedGlobals.loadStartMenuConfig();
  await window.protectedGlobals.renderPinnedAppsGrid();
  if (!window.protectedGlobals.apps) return;

  for (const app of window.protectedGlobals.apps) {
    try {
      if (app.requestAdminPerm) {
        window.protectedGlobals.initAppRuntimeState(app);
      }
    } catch (e) {
      window.protectedGlobals.throwError("renderAppsGrid", "Failed while loading app", e, {
        appId: app && app.id,
        path: app && app.path,
      });
    }
  }
};
// ----------------- CREATE START BUTTON -----------------

// ============= START MENU CONFIG SYSTEM =============
window.protectedGlobals._startMenuConfig = null;

const loadStartMenuConfig = window.protectedGlobals.loadStartMenuConfig = async function () {
  const configPath = 'systemfiles/userprofile/startMenu-config.json';
  const configText = String(await window.protectedGlobals.ReadFile(configPath, { text: true, direct: true }) || "");
  try {
    window.protectedGlobals._startMenuConfig = JSON.parse(configText);
  } catch (e) {
    window.protectedGlobals._startMenuConfig = {};
  }
  return window.protectedGlobals._startMenuConfig;
}

const saveStartMenuConfig = window.protectedGlobals.saveStartMenuConfig = async function () {
  if (!window.protectedGlobals._startMenuConfig) return;
  await window.protectedGlobals.WriteFile('systemfiles/userprofile/startMenu-config.json', JSON.stringify(window.protectedGlobals._startMenuConfig), { text: true });
}

const ensureStartMenuConfig = async function () {
  if (!window.protectedGlobals._startMenuConfig) {
    await loadStartMenuConfig();
  }
  if (!window.protectedGlobals._startMenuConfig) {
    window.protectedGlobals._startMenuConfig = {};
  }
  if (!Array.isArray(window.protectedGlobals._startMenuConfig.pinnedApps)) {
    window.protectedGlobals._startMenuConfig.pinnedApps = [];
  }
  if (!Array.isArray(window.protectedGlobals._startMenuConfig.recents)) {
    window.protectedGlobals._startMenuConfig.recents = [];
  }
  if (!window.protectedGlobals._startMenuConfig.displayMode) {
    window.protectedGlobals._startMenuConfig.displayMode = startMenuDefaults.displayMode;
  }
  if (!window.protectedGlobals._startMenuConfig.sortOrder) {
    window.protectedGlobals._startMenuConfig.sortOrder = startMenuDefaults.sortOrder;
  }
  if (typeof window.protectedGlobals._startMenuConfig.sortSections !== 'boolean') {
    window.protectedGlobals._startMenuConfig.sortSections = startMenuDefaults.sortSections;
  }
  return window.protectedGlobals._startMenuConfig;
}

window.protectedGlobals.addToRecents = async function (appId) {
  await ensureStartMenuConfig();
  const recents = window.protectedGlobals._startMenuConfig.recents || [];
  const index = recents.indexOf(appId);
  if (index > -1) recents.splice(index, 1);
  recents.unshift(appId);
  if (recents.length > (window.protectedGlobals._startMenuConfig.maxRecents || 5)) {
    recents.pop();
  }
  window.protectedGlobals._startMenuConfig.recents = recents;
  await saveStartMenuConfig();
}

const removeFromStartMenu = async function (appId) {
  await ensureStartMenuConfig();
  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const index = pinnedApps.indexOf(appId);
  if (index > -1) {
    pinnedApps.splice(index, 1);
    window.protectedGlobals._startMenuConfig.pinnedApps = pinnedApps;
    saveStartMenuConfig();
    renderPinnedAppsGrid();
  }
}

// ============= CREATE START MENU -================
var existingStartMenu = document.getElementById("startMenu");
if (existingStartMenu) existingStartMenu.remove();
const startMenu = window.protectedGlobals.startMenu = document.createElement("div");
startMenu.id = "startMenu";
startMenu.className = "startMenu";
startMenu.style.zIndex = 100001; // maximum z-index to ensure it appears on top of everything

const startMenuDefaults = {
  displayMode: "tile",
  sortOrder: "asc",
  sortSections: false,
};

const normalizeStartMenuConfigValue = function (value, fallback, allowedValues) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (allowedValues && allowedValues.indexOf(normalized) === -1) {
    return fallback;
  }
  return normalized;
};

const getConfiguredDisplayMode = function () {
  const config = window.protectedGlobals._startMenuConfig || {};
  const mode = normalizeStartMenuConfigValue(config.displayMode, startMenuDefaults.displayMode, ["tile", "list"]);
  return mode === "list" ? "list" : "tile";
};

const getConfiguredSortOrder = function () {
  const config = window.protectedGlobals._startMenuConfig || {};
  return normalizeStartMenuConfigValue(config.sortOrder, startMenuDefaults.sortOrder, ["asc", "desc"]);
};

const getConfiguredSortSections = function () {
  const config = window.protectedGlobals._startMenuConfig || {};
  if (typeof config.sortSections === "boolean") return config.sortSections;
  const value = String(config.sortSections || "").trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
};

const getAppSortLabel = function (app) {
  const label = app && (app.label || app.id || app.name || "");
  return String(label || "").trim();
};

const compareAppLabels = function (a, b, order) {
  const left = getAppSortLabel(a).toLocaleLowerCase();
  const right = getAppSortLabel(b).toLocaleLowerCase();
  if (left === right) return 0;
  if (order === "desc") {
    return left > right ? -1 : 1;
  }
  return left < right ? -1 : 1;
};

const getAllAppsSearchQuery = function () {
  const input = document.getElementById("allAppsSearchInput");
  if (!input) return "";
  return String(input.value || "").trim().toLowerCase();
};

const updateStartMenuBodyPosition = function () {
  const body = document.querySelector(".startMenuBody");
  const toolbar = document.getElementById("startMenuToolbar");
  if (!body) return;
  if (toolbar && toolbar.style.display !== "none") {
    body.style.top = "134px";
    return;
  }
  body.style.top = "90px";
};

const signOutSvg = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
  <path d="M16 17l5-5-5-5"/>
  <path d="M21 12H9"/>
</svg>`;

const getBatteryIconSvg = function (level, charging) {
  const safeLevel = Math.max(0, Math.min(100, Number(level) || 0));
  const fillWidth = Math.max(3, Math.round((safeLevel / 100) * 12));
  const batteryColor = charging ? '#5eead4' : 'currentColor';
  const chargeBolt = charging ? `
    <g transform="translate(-0.8 0)">
      <path d="M11.1 5.2L7.2 12.6h3.1L8.2 18.8l7.1-8.1h-3.4l1.5-5.5Z" fill="currentColor" opacity="0.96"/>
    </g>
  ` : '';

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="6" width="16" height="12" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <rect x="4.2" y="8.2" width="${fillWidth}" height="7.6" rx="1.5" fill="${batteryColor}" opacity="${safeLevel > 0 ? 1 : 0.2}"/>
      <rect x="18" y="9" width="3" height="6" rx="1" fill="currentColor"/>
      ${chargeBolt}
    </svg>
  `;
};

const syncStartMenuTheme = function () {
  const isDark = !!(window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark);
  startMenu.classList.toggle('dark', isDark);
  startMenu.classList.toggle('light', !isDark);

  const theme = isDark;
  const baseBg = theme ? '#1f1f1f' : '#ffffff';
  const inputBg = theme ? '#161616' : '#f8fafc';
  const hoverBg = theme ? '#2a2a2a' : '#f3f4f6';
  const border = theme ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.08)';
  const color = theme ? '#f5f5f5' : '#1f2937';
  const shadow = theme ? '0 0 0 1px rgba(255,255,255,0.02)' : '0 0 0 1px rgba(15,23,42,0.04)';

  startMenu.querySelectorAll('.start-menu-shortcut').forEach((btn) => {
    btn.style.background = baseBg;
    btn.style.border = border;
    btn.style.color = color;
    btn.style.boxShadow = shadow;
    btn.dataset.theme = theme ? 'dark' : 'light';
    btn.dataset.hoverBg = hoverBg;
    btn.style.transform = 'translateY(0)';
  });

  startMenu.querySelectorAll('.startMenuFilterBtn, .startMenuSearchWrap, .startMenuToolbar').forEach((node) => {
    if (!node) return;
    if (node.classList && node.classList.contains('startMenuSearchWrap')) {
      node.style.background = inputBg;
      node.style.border = border;
      node.style.boxShadow = shadow;
    } else if (node.classList && node.classList.contains('startMenuToolbar')) {
      node.style.background = theme ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)';
      node.style.borderBottom = theme ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.05)';
    } else {
      node.style.background = baseBg;
      node.style.border = border;
      node.style.color = color;
      node.style.boxShadow = shadow;
    }
  });

  const searchInput = document.getElementById('allAppsSearchInput');
  if (searchInput) {
    searchInput.style.color = color;
    searchInput.style.background = 'transparent';
  }
};

startMenu.innerHTML = `

<h3 style="margin:0 0 10px 0; font-size:18px;">Start</h3>

<div class="startMenuTabs">
  <button class="startMenuTab active" data-tab="pinned">Pinned</button>
  <button class="startMenuTab" data-tab="recents">Recent</button>
  <button class="startMenuTab" data-tab="all">All Apps</button>
  <button class="startMenuTab" data-tab="shortcuts">Shortcuts</button>
</div>

<div id="startMenuToolbar" class="startMenuToolbar" style="display:none;">
  <div class="startMenuToolbarRow">
    <label class="startMenuSearchWrap" aria-label="Search apps">
      <span class="startMenuSearchIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="6"></circle>
          <path d="M16 16l5 5"></path>
        </svg>
      </span>
      <input id="allAppsSearchInput" type="search" placeholder="Search apps" autocomplete="off" />
    </label>
    <div class="startMenuFilterGroup">
      <button type="button" class="startMenuFilterBtn startMenuDisplayToggle" data-display-mode="tile" aria-label="Toggle app layout">
        <span class="startMenuToggleIcon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="3.2" rx="1"></rect>
            <rect x="14" y="8.2" width="7" height="12.8" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
          </svg>
        </span>
        <span>Tiles</span>
      </button>
      <button type="button" class="startMenuFilterBtn startMenuSortToggle" data-sort-order="asc" aria-label="Toggle sort order">
        <span class="startMenuToggleIcon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14"></path>
            <path d="M8 9l4-4 4 4"></path>
          </svg>
        </span>
        <span>A→Z</span>
      </button>
      <button type="button" class="startMenuFilterBtn startMenuGroupBtn" data-group-mode="off">No groups</button>
    </div>
  </div>
</div>

<div class="startMenuBody">
    <div id="appsGrid" class="tabSection active grid-view" data-tab="pinned"></div>
    <div id="recentsGrid" class="tabSection grid-view" data-tab="recents"></div>
    <div id="allAppsGrid" class="tabSection grid-view" data-tab="all"></div>
    <div id="shortcutsGrid" class="tabSection list-view" data-tab="shortcuts"></div>
</div>

    <div class="statusBar">
    <div class="statusLeft">
        <button id="signOutBtn" type="button">${signOutSvg}<span>Sign Out</span></button>
    </div>

    <div class="statusRight">
      <span id="batteryStatus" class="statusPill">${getBatteryIconSvg(0, false)} <span>--%</span></span>
      <span id="timeStatus" class="statusPill">--:--</span>
    </div>
</div>
`;

syncStartMenuTheme();
document.body.appendChild(startMenu);

// Load config on startup
(async () => {
  await loadStartMenuConfig();
  await window.protectedGlobals.loadAppsFromTree();
  let desktopScript = document.createElement("script");
  desktopScript.textContent = await window.protectedGlobals.ReadFile("systemfiles/runtime/core/desktop.js", { text: true, direct: true });
  document.head.appendChild(desktopScript);
})();

// ============= TAB SWITCHING =============
window.protectedGlobals.tabButtons = startMenu.querySelectorAll('.startMenuTab');
window.protectedGlobals.tabSections = startMenu.querySelectorAll('.tabSection');

const syncStartMenuToolbar = function () {
  const toolbar = document.getElementById('startMenuToolbar');
  if (!toolbar) return;

  const activeTab = window.protectedGlobals.activeStartTab || 'pinned';
  const isAllAppsTab = activeTab === 'all';
  toolbar.style.display = isAllAppsTab ? 'block' : 'none';
  updateStartMenuBodyPosition();

  const displayMode = getConfiguredDisplayMode();
  const sortOrder = getConfiguredSortOrder();
  const grouped = getConfiguredSortSections();

  const displayButton = toolbar.querySelector('[data-display-mode]');
  if (displayButton) {
    displayButton.dataset.displayMode = displayMode;
    displayButton.classList.toggle('active', true);
    displayButton.setAttribute('aria-pressed', String(displayMode === 'list'));
    const displayIcon = displayMode === 'list'
      ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>'
      : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="3.2" rx="1"></rect><rect x="14" y="8.2" width="7" height="12.8" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>';
    displayButton.innerHTML = `<span class="startMenuToggleIcon">${displayIcon}</span><span>${displayMode === 'list' ? 'List' : 'Tiles'}</span>`;
  }

  const sortButton = toolbar.querySelector('[data-sort-order]');
  if (sortButton) {
    sortButton.dataset.sortOrder = sortOrder;
    sortButton.classList.toggle('active', true);
    sortButton.setAttribute('aria-pressed', String(sortOrder === 'desc'));
    const sortIcon = sortOrder === 'desc'
      ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"></path><path d="M16 15l-4 4-4-4"></path></svg>'
      : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"></path><path d="M8 9l4-4 4 4"></path></svg>';
    sortButton.innerHTML = `<span class="startMenuToggleIcon">${sortIcon}</span><span>${sortOrder === 'desc' ? 'Z→A' : 'A→Z'}</span>`;
  }

  const groupButton = toolbar.querySelector('[data-group-mode]');
  if (groupButton) {
    groupButton.dataset.groupMode = grouped ? 'on' : 'off';
    groupButton.textContent = grouped ? 'Grouped' : 'No groups';
    groupButton.classList.toggle('active', grouped);
  }

  const allSection = startMenu.querySelector('.tabSection[data-tab="all"]');
  if (allSection) {
    allSection.classList.toggle('list-view', displayMode === 'list');
    allSection.classList.toggle('grid-view', displayMode !== 'list');
  }
};

const bindStartMenuToolbar = function () {
  const toolbar = document.getElementById('startMenuToolbar');
  if (!toolbar || toolbar.dataset.bound === 'true') return;
  toolbar.dataset.bound = 'true';

  const searchInput = document.getElementById('allAppsSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (window.protectedGlobals.activeStartTab === 'all') {
        renderAllAppsGrid();
      }
    });
  }

  const displayButton = toolbar.querySelector('[data-display-mode]');
  if (displayButton) {
    displayButton.addEventListener('click', async () => {
      await ensureStartMenuConfig();
      const nextMode = displayButton.dataset.displayMode === 'list' ? 'tile' : 'list';
      window.protectedGlobals._startMenuConfig.displayMode = nextMode;
      await saveStartMenuConfig();
      syncStartMenuToolbar();
      if (window.protectedGlobals.activeStartTab === 'all') {
        renderAllAppsGrid();
      }
    });
  }

  const sortButton = toolbar.querySelector('[data-sort-order]');
  if (sortButton) {
    sortButton.addEventListener('click', async () => {
      await ensureStartMenuConfig();
      const nextOrder = sortButton.dataset.sortOrder === 'desc' ? 'asc' : 'desc';
      window.protectedGlobals._startMenuConfig.sortOrder = nextOrder;
      await saveStartMenuConfig();
      syncStartMenuToolbar();
      if (window.protectedGlobals.activeStartTab === 'all') {
        renderAllAppsGrid();
      }
    });
  }

  const groupButton = toolbar.querySelector('[data-group-mode]');
  if (groupButton) {
    groupButton.addEventListener('click', async () => {
      await ensureStartMenuConfig();
      const shouldGroup = groupButton.dataset.groupMode !== 'on';
      window.protectedGlobals._startMenuConfig.sortSections = shouldGroup;
      await saveStartMenuConfig();
      syncStartMenuToolbar();
      if (window.protectedGlobals.activeStartTab === 'all') {
        renderAllAppsGrid();
      }
    });
  }
};

const switchTab = window.protectedGlobals.switchTab = function switchTab(tabName) {
  if (!tabName) return;
  window.protectedGlobals.activeStartTab = tabName;
  document
    .querySelectorAll('.app-context-menu, .app-menu')
    .forEach(function (menuNode) {
      menuNode.remove();
    });
  // Hide all sections
  window.protectedGlobals.tabSections.forEach(function (section) {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  // Deactivate all tabs
  window.protectedGlobals.tabButtons.forEach(function (btn) {
    btn.classList.remove('active');
  });

  // Show selected section
  var section = startMenu.querySelector(`.tabSection[data-tab="${tabName}"]`);
  if (section) {
    section.classList.add('active');
    const isListView = section.classList.contains('list-view') || (tabName === 'all' && getConfiguredDisplayMode() === 'list');
    section.style.display = isListView ? 'flex' : 'grid';
  }

  // Activate selected tab
  var btn = startMenu.querySelector(`.startMenuTab[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');

  bindStartMenuToolbar();
  syncStartMenuToolbar();

  // Render appropriate grid
  if (tabName === 'pinned') renderPinnedAppsGrid();
  else if (tabName === 'recents') renderRecentsGrid();
  else if (tabName === 'all') renderAllAppsGrid();
  else if (tabName === 'shortcuts') renderQuickActionsGrid();
}

window.protectedGlobals.tabButtons.forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchTab(this.dataset && this.dataset.tab);
  });
});

const getBrightnessValue = function () {
  window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
  const raw = parseInt(window.protectedGlobals.statusData.brightness, 10);
  if (Number.isNaN(raw)) return 100;
  return Math.min(100, Math.max(0, raw));
};

const getBrightnessMax = function () {
  window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
  return !!window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100;
};

const updateBrightnessOverlayTheme = function () {
  const overlay = window.protectedGlobals.brightnessOverlayEl;
  if (!overlay) return;
  const isDark = !!(window.protectedGlobals.data.dark);
  const theme = {
    bg: isDark ? "rgba(25, 28, 34, 0.96)" : "rgba(255, 255, 255, 0.96)",
    border: isDark ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(0,0,0,0.12)",
    color: isDark ? "#f7f7f7" : "#202124",
    accent: isDark ? "#63b3ed" : "#2563eb",
    track: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
    shadow: isDark ? "0 12px 28px rgba(0,0,0,0.35)" : "0 12px 28px rgba(0,0,0,0.16)",
  };

  overlay.style.background = theme.bg;
  overlay.style.border = theme.border;
  overlay.style.color = theme.color;
  overlay.style.boxShadow = theme.shadow;
  const slider = window.protectedGlobals.brightnessOverlaySlider;
  if (slider) {
    slider.style.accentColor = theme.accent;
  }
};

const updateBrightnessOverlayValue = function (value) {
  const overlay = window.protectedGlobals.brightnessOverlayEl;
  if (!overlay) return;
  const max = getBrightnessMax();
  const percent = Math.min(max, Math.max(0, parseInt(value, 10) || 0));
  const label = window.protectedGlobals.brightnessOverlayLabel;
  const slider = window.protectedGlobals.brightnessOverlaySlider;
  if (label) label.textContent = `${percent}%`;
  if (slider) {
    slider.max = max;
    slider.value = percent;
  }
};
let brightnessOverlayHideTimer = null;
const showBrightnessOverlay = function () {
  const overlay = window.protectedGlobals.brightnessOverlayEl || ensureBrightnessOverlay();
  if (!overlay.isConnected) {
    document.body.appendChild(overlay);
  }
  if (!overlay) return;
  overlay.style.display = "block";
  overlay.style.opacity = "1";
  overlay.style.pointerEvents = "auto";
  if (brightnessOverlayHideTimer) clearTimeout(brightnessOverlayHideTimer);
  brightnessOverlayHideTimer = setTimeout(() => {
    if (overlay && overlay.style.display !== "none") {
      overlay.style.display = "none";
    }
  }, 5000);
};

const syncBrightnessOverlayControls = function (options) {
  const slider = window.protectedGlobals.brightnessOverlaySlider;
  const max = getBrightnessMax();
  const currentValue = getBrightnessValue();
  const clampedValue = Math.min(currentValue, max);
  window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
  window.protectedGlobals.statusData.brightness = clampedValue;
  document.documentElement.style.filter = `brightness(${clampedValue}%)`;
  updateBrightnessOverlayValue(clampedValue);
  if (slider) {
    slider.max = max;
    slider.value = clampedValue;
  }
  if (options && options.persist && window.protectedGlobals.persistUserProfilePatch) {
    window.protectedGlobals.persistUserProfilePatch({ brightness: Number(clampedValue) });
  }
  if (options && options.showOverlay) {
    showBrightnessOverlay();
  }
};
let overlay;
const ensureBrightnessOverlay = function () {
  if (window.protectedGlobals.brightnessOverlayEl) return window.protectedGlobals.brightnessOverlayEl;
  let overlay = document.createElement("div");
  overlay.setAttribute("role", "status");
  overlay.style.position = "fixed";
  overlay.style.top = "16px";
  overlay.style.right = "16px";
  overlay.style.zIndex = "100003";
  overlay.style.display = "none";
  overlay.style.padding = "10px 12px";
  overlay.style.borderRadius = "12px";
  overlay.style.backdropFilter = "blur(12px)";
  overlay.style.width = "220px";
  overlay.style.maxWidth = "calc(100vw - 32px)";
  overlay.style.pointerEvents = "auto";
  overlay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;font-size:12px;font-weight:700;letter-spacing:0.01em;">
      <span style="opacity:0.72;">Brightness</span>
      <span data-role="brightness-label">100%</span>
    </div>
    <input data-role="brightness-slider" type="range" min="0" max="100" value="100" style="width:100%;margin-top:8px;cursor:pointer;">
  `;
  document.body.appendChild(overlay);
  window.protectedGlobals.brightnessOverlayEl = overlay;
  window.protectedGlobals.brightnessOverlayLabel = overlay.querySelector('[data-role="brightness-label"]');
  window.protectedGlobals.brightnessOverlaySlider = overlay.querySelector('[data-role="brightness-slider"]');

  const slider = window.protectedGlobals.brightnessOverlaySlider;
  if (slider) {
    slider.addEventListener("input", (e) => {
      const nextValue = Math.min(getBrightnessMax(), Math.max(0, parseInt(e.target.value, 10) || 0));
      window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
      window.protectedGlobals.statusData.brightness = nextValue;
      document.documentElement.style.filter = `brightness(${nextValue}%)`;
      updateBrightnessOverlayValue(nextValue);
      window.dispatchEvent(new CustomEvent("brightness-state-updated", {
        detail: {
          batterySaverEnabled: !!window.protectedGlobals.statusData.batterySaverEnabled,
          brightness: nextValue,
        },
      }));
      if (brightnessOverlayHideTimer) clearTimeout(brightnessOverlayHideTimer);
      brightnessOverlayHideTimer = setTimeout(() => {
        if (overlay && overlay.style.display !== "none") {
          overlay.style.display = "none";
        }
      }, 5000);
    });
    slider.addEventListener("pointerdown", () => {
      updateBrightnessOverlayValue(getBrightnessValue());
    });
    slider.addEventListener("change", () => {
      updateBrightnessOverlayValue(getBrightnessValue());
    });
    slider.addEventListener("pointerup", () => {
      updateBrightnessOverlayValue(getBrightnessValue());
    });
  }

  updateBrightnessOverlayTheme();
  updateBrightnessOverlayValue(getBrightnessValue());
  return overlay;
};

const applyBrightnessValue = function (value, persist = true, showOverlay = false) {
  const clamped = Math.min(getBrightnessMax(), Math.max(0, parseInt(value, 10) || 0));
  window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
  window.protectedGlobals.statusData.brightness = clamped;
  document.documentElement.style.filter = `brightness(${clamped}%)`;
  updateBrightnessOverlayValue(clamped);
  if (persist && window.protectedGlobals.persistUserProfilePatch) {
    window.protectedGlobals.persistUserProfilePatch({ brightness: Number(clamped) });
  }
  window.dispatchEvent(new CustomEvent("brightness-state-updated", {
    detail: {
      batterySaverEnabled: !!window.protectedGlobals.statusData.batterySaverEnabled,
      brightness: clamped,
    },
  }));
  if (showOverlay) {
    showBrightnessOverlay();
  }
};

const applyBrightnessDelta = window.protectedGlobals.applyBrightnessDelta = function (delta) {
  window.protectedGlobals.statusData = window.protectedGlobals.statusData || {};
  const currentBrightness = getBrightnessValue();
  const maxBrightness = getBrightnessMax();
  if ((delta > 0 && currentBrightness >= maxBrightness && window.protectedGlobals.statusData.batterySaverEnabled) || (currentBrightness === 100 && delta > 0)) return;
  applyBrightnessValue(currentBrightness + delta > maxBrightness ? maxBrightness : currentBrightness + delta, true, true);
};

window.addEventListener("styleapplied", () => {
  syncStartMenuTheme();
  updateBrightnessOverlayTheme();
  syncBrightnessOverlayControls();
});
window.addEventListener("brightness-state-updated", () => {
  syncStartMenuTheme();
  syncBrightnessOverlayControls();
});
ensureBrightnessOverlay();

const cycleFocusedWindow = window.protectedGlobals.cycleFocusedWindow = function (reverse, modKey = "Alt") {
  if ((window.protectedGlobals.cycleWindowFocus)) {
    window.protectedGlobals.cycleWindowFocus(!!reverse, modKey);
  }
}

const launchFocusedAppWindow = window.protectedGlobals.launchFocusedAppWindow = function () {
  console.log(window.protectedGlobals.atTop)
  var focusedApp = window.protectedGlobals.atTop;
    window.protectedGlobals.launchApp(focusedApp);
}

const closeFocusedAppWindow = window.protectedGlobals.closeFocusedAppWindow = function () {
  if (!window.protectedGlobals.atTop) return;
  var targetAppId = String(window.protectedGlobals.atTop || "").trim();
  if (!targetAppId) return;

  var roots = Array.from(document.querySelectorAll(".app-window-root"));
  var candidates = roots.filter(
    (root) => root.dataset && root.dataset.appId === targetAppId,
  );

  if (!candidates.length) {
    candidates = roots.filter(
      (root) => root.classList && root.classList.contains(targetAppId),
    );
  }

  if (!candidates.length) return;

  candidates.sort((a, b) => {
    var za = parseInt(a.style.zIndex) || 0;
    var zb = parseInt(b.style.zIndex) || 0;
    return za - zb;
  });

  var top = candidates[candidates.length - 1];
  if (!top) return;

  var appObj = (window.protectedGlobals.apps || []).find(function (a) {
    return window.protectedGlobals.appMatchesIdentifier(a, targetAppId);
  });
  if (appObj && appObj.globalVarObjectString && appObj.allAppArrayString) {
    if (window[appObj.globalVarObjectString]) {
      var arrayKeys = [];
      if (typeof appObj.allAppArrayString === "string") {
        var single = appObj.allAppArrayString.trim();
        if (single) arrayKeys.push(single);
      } else if (Array.isArray(appObj.allAppArrayString)) {
        for (var ak = 0; ak < appObj.allAppArrayString.length; ak++) {
          var normalized =
            typeof appObj.allAppArrayString[ak] === "string"
              ? appObj.allAppArrayString[ak].trim()
              : "";
          if (normalized && arrayKeys.indexOf(normalized) === -1) {
            arrayKeys.push(normalized);
          }
        }
      }

      for (var keyCursor = 0; keyCursor < arrayKeys.length; keyCursor++) {
        var arr = window[appObj.globalVarObjectString][arrayKeys[keyCursor]];
        if (!Array.isArray(arr)) continue;
        for (var i = arr.length - 1; i >= 0; i--) {
          var inst = arr[i];
          var instRoot = inst && (inst.rootElement || inst.root || inst.rootEl);
          if (
            inst === top ||
            instRoot === top ||
            (top && top._goldenbodyId && (inst._goldenbodyId === top._goldenbodyId || (instRoot && instRoot._goldenbodyId === top._goldenbodyId)))
          ) {
            arr[i].closeWindow();
          }
        }
      }
    }
  }

  window.protectedGlobals.removeAllEventListenersForApp(targetAppId + top._goldenbodyId);
}

const createShortcutButton = function createShortcutButton(label, description, handler) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "start-menu-shortcut";
  btn.style.cursor = "pointer";
  btn.style.font = "inherit";
  btn.style.lineHeight = "1.3";
  btn.style.gap = "8px";
  btn.style.boxShadow = "0 0 0 1px rgba(15,23,42,0.04)";
  btn.innerHTML = `<p>${label}</p><span>${description}</span>`;

  const applyShortcutButtonTheme = (state = "idle") => {
    const isDark = !!(window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark);
    const idleBg = isDark ? '#1f1f1f' : '#ffffff';
    const hoverBg = isDark ? '#2a2a2a' : '#f3f4f6';
    const border = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.08)';
    const color = isDark ? '#f5f5f5' : '#1f2937';
    const shadow = isDark ? '0 0 0 1px rgba(255,255,255,0.02)' : '0 0 0 1px rgba(15,23,42,0.04)';
    btn.style.background = state === 'hover' ? hoverBg : idleBg;
    btn.style.border = border;
    btn.style.color = color;
    btn.style.boxShadow = shadow;
    btn.style.transform = state === 'hover' ? 'translateY(-1px)' : 'translateY(0)';
  };

  btn.addEventListener("mouseenter", () => applyShortcutButtonTheme("hover"));
  btn.addEventListener("mouseleave", () => applyShortcutButtonTheme("idle"));
  btn.addEventListener("click", handler);
  applyShortcutButtonTheme("idle");
  return btn;
}

const renderQuickActionsGrid = async function () {
  const container = document.getElementById('shortcutsGrid');
  if (!container) return;
  container.innerHTML = '';

  const actions = [
    ['Open new window', 'Ctrl+N', () => launchFocusedAppWindow()],
    ['Close focused window', 'Ctrl+W', () => closeFocusedAppWindow()],
    ['Take Screenshot', 'Ctrl+Shift+S', () => {
      startMenu.style.display = 'none';
      window.protectedGlobals.takeScreenshot();
    }],
    ['Brightness down', 'Ctrl+Alt+Down', () => applyBrightnessDelta(-5)],
    ['Brightness up', 'Ctrl+Alt+Up', () => applyBrightnessDelta(5)],
  ];

  actions.forEach(([label, description, handler]) => {
    container.appendChild(createShortcutButton(label, description, handler));
  });
}

// ============= RENDER FUNCTIONS =============
const renderPinnedAppsGrid = window.protectedGlobals.renderPinnedAppsGrid = async function () {
  const container = document.getElementById('appsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals._startMenuConfig || !window.protectedGlobals.apps) return;

  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const appsMap = new Map(    window.protectedGlobals.apps.map(app => [
app.id, app
  ])  );

  for (const appId of pinnedApps) {
    const app = appsMap.get(appId);
    if (!app || app.headless) continue;
    createAppTile(app, container, true);
  }
}

const renderRecentsGrid = async function () {
  const container = document.getElementById('recentsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals._startMenuConfig || !window.protectedGlobals.apps) return;

  const recents = window.protectedGlobals._startMenuConfig.recents || [];
  const appsMap = new Map(    window.protectedGlobals.apps.map(app => [
app.id, app
  ])  );

  for (const appId of recents) {
    const app = appsMap.get(appId);
    if (!app || app.headless) continue;
    createAppTile(app, container, false);
  }

  if (container.children.length === 0) {
    container.innerHTML =       '<p style="text-align:center;opacity:0.6;font-size:13px;">No recent apps</p>';
  }
}

const renderAllAppsGrid = async function () {
  const container = document.getElementById('allAppsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals.apps) return;
  const query = getAllAppsSearchQuery();
  const order = getConfiguredSortOrder();
  const grouped = getConfiguredSortSections();
  const displayMode = getConfiguredDisplayMode();

  const filteredApps = window.protectedGlobals.apps.filter((app) => {
    if (app.headless) return false;
    if (!query) return true;
    const haystack = `${app.label || app.id || ''} ${app.id || ''}`.toLowerCase();
    return haystack.includes(query);
  });

  filteredApps.sort((a, b) => compareAppLabels(a, b, order));

  const appendGroup = function (groupKey, apps) {
    const groupWrap = document.createElement('div');
    groupWrap.className = 'startMenuAppGroup';

    const heading = document.createElement('div');
    heading.className = 'startMenuAppGroupHeader';
    heading.textContent = groupKey;
    groupWrap.appendChild(heading);

    const inner = document.createElement('div');
    inner.className = displayMode === 'list' ? 'startMenuAppGroupList' : 'startMenuAppGroupGrid';
    for (const app of apps) {
      inner.appendChild(createAppTile(app, inner, false, displayMode === 'list'));
    }
    groupWrap.appendChild(inner);
    container.appendChild(groupWrap);
  };

  if (grouped) {
    const groups = new Map();
    for (const app of filteredApps) {
      const label = getAppSortLabel(app);
      const firstLetter = label ? label.trim()[0].toUpperCase() : '#';
      const groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(app);
    }

    const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const orderedKeys = order === 'desc' ? keys.reverse() : keys;

    if (!orderedKeys.length) {
      container.innerHTML = '<p style="text-align:center;opacity:0.6;font-size:13px;">No apps found</p>';
      return;
    }

    for (const key of orderedKeys) {
      appendGroup(key, groups.get(key));
    }
    return;
  }

  if (!filteredApps.length) {
    container.innerHTML = '<p style="text-align:center;opacity:0.6;font-size:13px;">No apps found</p>';
    return;
  }

  for (const app of filteredApps) {
    createAppTile(app, container, false, displayMode === 'list');
  }
}

const createAppTile = function (app, container, draggable, listMode = false) {
  const div = document.createElement('div');
  div.className = 'app' + (listMode ? ' app-list-item' : ' app-tile-item');
  div.dataset.appId = app.id;
  div.id = app.id + 'app';
  div.style.padding = listMode ? '10px 12px' : '10px';
  div.style.borderRadius = listMode ? '10px' : '6px';
  div.style.textAlign = listMode ? 'left' : 'center';
  div.style.minHeight = listMode ? '42px' : '35px';
  div.style.maxHeight = listMode ? 'auto' : '35px';
  div.style.cursor = 'pointer';
  if (draggable) {
    div.draggable = true;
  }

  if (listMode) {
    const iconMarkup = app.pngEnabled ? `<img src="data:image/[FORMAT];base64,${app.icon}" style="width:18px;height:18px;flex-shrink:0;">` : app.icon;
    div.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;">${iconMarkup}</span><span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${app.label}</span>`;
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '8px';
    div.style.justifyContent = 'flex-start';
  } else {
    div.innerHTML = ` ${app.pngEnabled ? `<img src="data:image/[FORMAT];base64,${app.icon}" style="width:25%;height:50%;margin-bottom:4px;">` : app.icon} <br> <span style="font-size:11px;">${app.label}</span> `;
  }

  if (draggable) {
    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('appId', div.dataset.appId);
    });

    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
      document        .querySelectorAll('.app.drag-over')        .forEach(el => el.classList.remove('drag-over'));
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      div.classList.add('drag-over');
    });

    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });

    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const appId = e.dataTransfer.getData('appId');
      const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
      const fromIndex = pinnedApps.indexOf(appId);
      const toIndex = pinnedApps.indexOf(div.dataset.appId);
      if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
        pinnedApps.splice(fromIndex, 1);
        pinnedApps.splice(toIndex, 0, appId);
        window.protectedGlobals._startMenuConfig.pinnedApps = pinnedApps;
        await saveStartMenuConfig();
        renderPinnedAppsGrid();
      }
    });
  }

  function runAppPackageContextMenu(evt) {
    if(app.cmfl1) {
      window[app.globalVarObjectString][app.cmfl1](evt);
    }
    else {
      window.protectedGlobals.cmfl1(evt, app);
    }
  }

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    runAppPackageContextMenu(e);
    showAppContextMenu(e.clientX, e.clientY, app, draggable).catch(() => {});
  });

  div.addEventListener('click', () => {
    window.protectedGlobals.launchApp(div.dataset.appId);
    startMenu.style.display = 'none';
  });

  if (container) {
    container.appendChild(div);
  }
  return div;
}

const showAppContextMenu = async function (x, y, app, canPin) {
  await ensureStartMenuConfig();

  const existing = document.querySelector('.app-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'app-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const appId = app.id;
  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const isPinned = pinnedApps.includes(appId);

  let html = '';

  if (!canPin && !isPinned) {
    html += '<button class="context-menu-item" data-action="pin">Pin to Start Menu</button>';
  } else if (!canPin && isPinned) {
    html += '<button class="context-menu-item danger" data-action="unpin">Unpin from Start Menu</button>';
  }

  if (canPin) {
    html += '<button class="context-menu-item danger" data-action="remove">Unpin from Start Menu</button>';
  }

  menu.innerHTML = html;
  document.body.appendChild(menu);

  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (action === 'pin') {
        const nextPinned = [...new Set([...(window.protectedGlobals._startMenuConfig.pinnedApps || []), appId])];
        window.protectedGlobals._startMenuConfig.pinnedApps = nextPinned;
        saveStartMenuConfig();
        renderPinnedAppsGrid();
        switchTab('pinned');
      } else if (action === 'unpin' || action === 'remove') {
        removeFromStartMenu(appId);
        if (window.protectedGlobals.startMenu.style.display !== 'none') {
          switchTab('pinned');
        }
      }
      menu.remove();
    });
  });

  setTimeout(() => {
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('pointerdown', closeHandler);
      }
    };
    document.addEventListener('pointerdown', closeHandler);
  }, 0);
}

// Wire up sign out button (now inside the statusRight area) to call rebuildhandler
{
  var sb = document.getElementById("signOutBtn");
  if (sb) {
    if (window.protectedGlobals.systemAPIs.onSignOut)
      sb.removeEventListener("click", window.protectedGlobals.systemAPIs.onSignOut);
    window.protectedGlobals.systemAPIs.onSignOut = () => {
      window.protectedGlobals.rebuildhandler();
    };
    sb.addEventListener("click", window.protectedGlobals.systemAPIs.onSignOut);
  }
}

// -------- TIME --------
const updateTime = window.protectedGlobals.updateTime = function updateTime() {
  var now = new Date();
  var time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  var timeNode = document.getElementById("timeStatus");
  if (timeNode) timeNode.textContent = time;
}

updateTime();
{
  if (window.protectedGlobals.systemAPIs.timeIntervalId)
    clearInterval(window.protectedGlobals.systemAPIs.timeIntervalId);
  window.protectedGlobals.systemAPIs.timeIntervalId = setInterval(updateTime, 1000);
}

// -------- BATTERY --------
if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    function updateBattery() {
      var level = Math.round(battery.level * 100);
      var charging = !!battery.charging;
      window.protectedGlobals.batteryLevel = level;
      window.protectedGlobals.batteryCharging = battery.charging;

      var batteryNode = document.getElementById("batteryStatus");
      if (!batteryNode) return;
      batteryNode.innerHTML = `${getBatteryIconSvg(level, charging)}<span>${level}%</span>`;
    }
    window.protectedGlobals.updateBattery = updateBattery;
    setTimeout(() => {
      updateBattery();
    }, 1000);
    if (
      window.protectedGlobals.systemAPIs.battery &&
      window.protectedGlobals.systemAPIs.battery.ref
    ) {
      window.protectedGlobals.systemAPIs.battery.ref.removeEventListener(
        "levelchange",
        window.protectedGlobals.systemAPIs.battery.levelHandler,
      );
      window.protectedGlobals.systemAPIs.battery.ref.removeEventListener(
        "chargingchange",
        window.protectedGlobals.systemAPIs.battery.chargingHandler,
      );
    }
    window.protectedGlobals.systemAPIs.battery = {
      ref: battery,
      levelHandler: updateBattery,
      chargingHandler: updateBattery,
    };
    battery.addEventListener(
      "levelchange",
      window.protectedGlobals.systemAPIs.battery.levelHandler,
    );
    battery.addEventListener(
      "chargingchange",
      window.protectedGlobals.systemAPIs.battery.chargingHandler,
    );
  });
} else {
  var batteryNode = document.getElementById("batteryStatus");
  if (batteryNode) batteryNode.innerHTML = `${getBatteryIconSvg(0, false)}<span>N/A</span>`;
}

// ----------------- TOGGLE START MENU -----------------
window.protectedGlobals.starthandler = () => {
  if (!startMenu.isConnected) document.body.appendChild(startMenu);
  if (window.protectedGlobals.data.taskbarOnTop) {startMenu.style.top = window.protectedGlobals.currentTaskbarHeight; startMenu.style.bottom = 'initial'} else {startMenu.style.bottom = window.protectedGlobals.currentTaskbarHeight; startMenu.style.top = 'initial'}

  startMenu.style.display =
    startMenu.style.display === "block" ? "none" : "block";
  // Auto-switch to pinned tab when opening
  if (startMenu.style.display === "block") {
    switchTab("pinned");
  }
};

// Note: App launching is now handled by createAppTile click handler
// which closes the menu


// ----------------- CLOSE MENU ON OUTSIDE CLICK -----------------
{
  if (window.protectedGlobals.systemAPIs.onDocumentClick)
    document.removeEventListener(
      "click",
      window.protectedGlobals.systemAPIs.onDocumentClick,
    );
  window.protectedGlobals.systemAPIs.onDocumentClick = (e) => {
    var contextMenuRoot =       e.target && e.target.closest
        ? e.target.closest(
            '.app-context-menu, #custom-context-menu, [id*="context-menu"], [class*="context-menu"], [class*="contextmenu"], .misc',
          )
        : null;
    if (contextMenuRoot) {
      return;
    }
    try {
    if (
      !startMenu.contains(e.target) &&
      e.target !== document.getElementById("▶") && e.target !== document.getElementById("▶").img
    ) {
      startMenu.style.display = "none";
    }
    } catch (e) {}
  };
  document.addEventListener("click", window.protectedGlobals.systemAPIs.onDocumentClick);
}
})();