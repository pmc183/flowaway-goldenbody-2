"use strict";
(function () {
  window.protectedGlobals.osVersion = "v2.8.0";
  window.alert = () => {};
  window.confirm = () => true;
  window.prompt = () => null;
  if (window.protectedGlobals.__booted__) return;
  window.protectedGlobals.__booted__ = true;
  const loadOverlay = document.createElement("div");
  loadOverlay.id = "loadOverlay";
  loadOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100004; /* Ensure it's on top of other elements */
  `;

  const loadMessage = document.createElement("div");
  loadMessage.textContent = "Loading...";
  loadMessage.style.cssText = `
    color: white;
    font-size: 24px;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  loadOverlay.appendChild(loadMessage);
  document.body.appendChild(loadOverlay);

  window.protectedGlobals.removeLoadOverlay = function () {
    loadOverlay.remove();
  };
  window.protectedGlobals = window.protectedGlobals || {};

  window.permGlobals = window.permGlobals || {};
  window.protectedGlobals.timerSpeed = 1;
  window.protectedGlobals.workers = {};
window.protectedGlobals.removeAllEventListenersInWindow = function() {
  for (const listener of window.protectedGlobals.____gbEventListners) {
    window.removeEventListener(listener.type, listener.handler, listener.options);
    document.removeEventListener(listener.type, listener.handler, listener.options);
  }
  window.protectedGlobals.____gbEventListners = [];
}
window.protectedGlobals.nativeEventTargetAdd =
  window.EventTarget &&
  window.EventTarget.prototype &&
  (window.EventTarget.prototype.addEventListener)
    ? window.EventTarget.prototype.addEventListener
    : null;
window.protectedGlobals.nativeDocumentEventlister = window.protectedGlobals.nativeEventTargetAdd
  ? window.protectedGlobals.nativeEventTargetAdd.bind(document)
  : document.addEventListener.bind(document);
window.protectedGlobals.nativeWindowEventlister = window.protectedGlobals.nativeEventTargetAdd
  ? window.protectedGlobals.nativeEventTargetAdd.bind(window)
  : window.addEventListener.bind(window);
window.protectedGlobals.nativeEventTargetRemove =
  window.EventTarget &&
  window.EventTarget.prototype &&
  (window.EventTarget.prototype.removeEventListener)
    ? window.EventTarget.prototype.removeEventListener
    : null;
window.protectedGlobals.nativeDocumentEventRemover = window.protectedGlobals.nativeEventTargetRemove
  ? window.protectedGlobals.nativeEventTargetRemove.bind(document)
  : document.removeEventListener.bind(document);
window.protectedGlobals.nativeWindowEventRemover = window.protectedGlobals.nativeEventTargetRemove
  ? window.protectedGlobals.nativeEventTargetRemove.bind(window)
  : window.removeEventListener.bind(window);

window.protectedGlobals.isValidEventListener = function(handler) {
  return (
    (handler) ||
    !!(handler && (handler.handleEvent))
  );
}

window.protectedGlobals.normalizeCaptureOption = function(options) {
  if (typeof options === "boolean") return options;
  if (
    options &&
    typeof options === "object" &&
    typeof options.capture === "boolean"
  )
    return options.capture;
  return false;
}

window.protectedGlobals.normalizeAddEventArgs = function(a, b, c, d) {
  // Supports both signatures:
  // 1) native: (type, handler, options)
  // 2) scoped: (appname, type, handler, options)
  if (typeof b === "string" && window.protectedGlobals.isValidEventListener(c)) {
    return { appname: String(a || ""), type: b, handler: c, options: d };
  }
  return { appname: "", type: a, handler: b, options: c };
};

window.protectedGlobals.addScopedListener = function(
  targetName,
  nativeAdd,
  appname,
  type,
  handler,
  options,
) {
  if (typeof type !== "string" || !window.protectedGlobals.isValidEventListener(handler)) {
    return;
  }
  window.protectedGlobals.____gbEventListners.push({type, handler, options});
  nativeAdd(type, handler, options);

  if (!appname) return;
  var scopedAppName = String(appname);
  if (!scopedAppName) return;
  window.protectedGlobals[scopedAppName + "_handlers"] =
    window.protectedGlobals[scopedAppName + "_handlers"] || [];
  window.protectedGlobals[scopedAppName + "_handlers"].push({
    target: targetName,
    type,
    handler,
    options,
    capture: window.protectedGlobals.normalizeCaptureOption(options),
  });
}

document.addEventListener = function (a, b, c, d) {
  var parsed = window.protectedGlobals.normalizeAddEventArgs(a, b, c, d);
  window.protectedGlobals.addScopedListener(
    "document",
    window.protectedGlobals.nativeDocumentEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.addEventListener = function (a, b, c, d) {
  var parsed = window.protectedGlobals.normalizeAddEventArgs(a, b, c, d);
  window.protectedGlobals.addScopedListener(
    "window",
    window.protectedGlobals.nativeWindowEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.protectedGlobals.removeAllEventListenersForApp = function (appname) {
  var scopedAppName = String(appname || "");
  if (!scopedAppName) return;
  var handlers = window.protectedGlobals[scopedAppName + "_handlers"] || [];
  handlers.forEach(({ target, type, handler, options, capture }) => {
    if (target === "document") {
      window.protectedGlobals.nativeDocumentEventRemover(type, handler, options);
      window.protectedGlobals.nativeDocumentEventRemover(
        type,
        handler,
        typeof capture === "boolean"
          ? capture
          : window.protectedGlobals.normalizeCaptureOption(options),
      );
      return;
    }
    if (target === "window") {
      window.protectedGlobals.nativeWindowEventRemover(type, handler, options);
      window.protectedGlobals.nativeWindowEventRemover(
        type,
        handler,
        typeof capture === "boolean"
          ? capture
          : window.protectedGlobals.normalizeCaptureOption(options),
      );
      return;
    }
    // Backward compatibility for older tracked entries without target.
    var fallbackCapture =
      typeof capture === "boolean" ? capture : window.protectedGlobals.normalizeCaptureOption(options);
    window.protectedGlobals.nativeWindowEventRemover(type, handler, options);
    window.protectedGlobals.nativeWindowEventRemover(type, handler, fallbackCapture);
    window.protectedGlobals.nativeDocumentEventRemover(type, handler, options);
    window.protectedGlobals.nativeDocumentEventRemover(type, handler, fallbackCapture);
  });
  window.protectedGlobals[scopedAppName + "_handlers"] = [];
};
// we want dynamic timer speed adjustment, so we will override setInterval and clearInterval to allow for that
(() => {
  const nativeSetTimeout = window.setTimeout;
  const nativeClearTimeout = window.clearTimeout;

  const intervals = new Map();
  let nextId = 1;

  window.setInterval = (cb, interval) => {
    if (interval === undefined || interval === null || isNaN(interval) || interval < 0) {
      throw new TypeError("Interval must be a positive number");
    }

    if (typeof cb !== "function") {
      throw new TypeError("Callback must be a function");
    }
    const id = nextId++;

    const entry = {
      timeout: null,
      cancelled: false
    };

    intervals.set(id, entry);

    const tick = () => {
      if (entry.cancelled) return;

      try {
        cb();
      } catch (err) {
        console.error(err);
      }

      if (!entry.cancelled) {
        const speed =
          Number(window.protectedGlobals?.timerSpeed) || 1;

        entry.timeout = nativeSetTimeout(
          tick,
          interval * speed
        );
      }
    };

    const speed =
      Number(window.protectedGlobals?.timerSpeed) || 1;

    entry.timeout = nativeSetTimeout(
      tick,
      interval * speed
    );

    return id;
  };

  window.clearInterval = (id, options) => {
    const entry = intervals.get(id);
    if (!entry) return;

    entry.cancelled = true;
    nativeClearTimeout(entry.timeout);
    intervals.delete(id);

    if (!options?.nolog) {
      console.log("Interval cleared: " + String(id));
    }
  };

  window.protectedGlobals.clearAllIntervals = () => {
    for (const id of [...intervals.keys()]) {
      window.clearInterval(id, { nolog: true });
    }
  };

  window.protectedGlobals.clearAllIntervals =
    window.protectedGlobals.clearAllIntervals;
})();

  window.protectedGlobals.____gbEventListners = [];
  if (window.protectedGlobals._bootLoaded) {
    return;
  }
  window.protectedGlobals._bootLoaded = true;
  window.protectedGlobals.iconDataToBase64 = function (raw) {
    if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
      const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
      const chunkSize = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
    if (typeof raw === "string") {
      return raw;
    }
    return null;
  };
  (async () => {
    window.protectedGlobals.pickerPreference = { sortMode: "name", sortOrder: "asc" };
    const data = await window.protectedGlobals.filePost({ requestFile: true, requestFileName: 'systemfiles/runtime/core/runtimeCore.js', text: true });
    let script = document.createElement('script');
    script.textContent = data;
    document.head.appendChild(script);

    const preferenceText = await window.protectedGlobals.ReadFile('/systemfiles/userprofile/pickerpreference.json', { text: true, direct: true }).catch(() => null);
    if (typeof preferenceText === 'string') {
      try {
        const preference = JSON.parse(preferenceText);
        window.protectedGlobals.pickerPreference = {
          sortMode: ["name", "size", "date"].includes(preference.sortMode) ? preference.sortMode : "name",
          sortOrder: ["asc", "desc"].includes(preference.sortOrder) ? preference.sortOrder : "asc",
        };
      } catch {}
    }
  })();
})();
