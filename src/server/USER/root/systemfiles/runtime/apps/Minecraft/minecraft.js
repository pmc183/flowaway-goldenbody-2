"use strict";

window.minecraft = async () => {
    // necessary for the runtime to track this app instance
    const appId = "Minecraft";
    let pos = window.protectedGlobals.getNextWindowXY();
    const instance = window.protectedGlobals.apptools.api.createAppInstance({ appId, posX: pos.x, posY: pos.y });
    window.protectedGlobals.apptools.api.trackInstance(instance, appId);

    // vars u prob need
    let appwindow = instance.rootElement;
    let dragTarget = instance.titlebarElement;
    const loadOverlay = document.createElement("div");
    loadOverlay.style.position = "absolute";
    loadOverlay.style.left = "0";
    loadOverlay.style.width = "100%";
    loadOverlay.style.height = "calc(100% - 28px)";
    loadOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    loadOverlay.style.display = "flex";
    loadOverlay.style.justifyContent = "center";
    loadOverlay.style.alignItems = "center";
    loadOverlay.innerHTML = "<p style='color: white; font-size: 24px;'>Loading Minecraft...</p>";
    appwindow.appendChild(loadOverlay);
    const iframe = document.createElement("iframe");
    iframe.src = 'about:blank';
    iframe.style.width = "100%";
    iframe.style.height = "calc(100% - 28px)";
    iframe.style.border = "none";
    appwindow.appendChild(iframe);
    const html = await window.protectedGlobals.ReadFile('/systemfiles/runtime/apps/Minecraft/Minecraft.html', { text: true, direct: true });
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.addEventListener('click', () => {
        iframe.contentWindow.focus();
    });
    iframe.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            iframe.contentDocument.exitPointerLock();
        }
    });
    const script = `window.addEventListener("click", (e) => {
    window.parent.postMessage({clickOnApp:true}, '*');
    });
    window.addEventListener("keydown", (e) => {
        e.stopPropagation();
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.metaKey) parts.push("Meta");
        if (e.shiftKey) parts.push("Shift");
        const key = e.key === " " ? "Space" : e.key;
        const comboKey = parts.length ? parts.concat(String(key)).join("+") : String(key);

        window.parent.postMessage({
            keydownOnApp: true,
            key: key,
            comboKey: comboKey,
            code: e.code,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey,
            repeat: e.repeat,
        }, '*');
    });
    window.addEventListener("keyup", (e) => {
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.altKey) parts.push("Alt");
        if (e.metaKey) parts.push("Meta");
        if (e.shiftKey) parts.push("Shift");
        const key = e.key === " " ? "Space" : e.key;
        const comboKey = parts.length ? parts.concat(String(key)).join("+") : String(key);

        window.parent.postMessage({
            keyupOnApp: true,
            key: key,
            comboKey: comboKey,
            code: e.code,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey,
            repeat: e.repeat,
        }, '*');
    });
    let __dragPointerId = null;

    window.addEventListener("pointerdown", (e) => {
        window.parent.postMessage({
            pointerdownOnApp: true,
            pointerId: e.pointerId,
            button: e.button,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey,
        }, '*');
    });
    window.addEventListener("pointerup", (e) => {
        window.parent.postMessage({
            pointerupOnApp: true,
            pointerId: e.pointerId,
            button: e.button,
            clientX: e.clientX,
            clientY: e.clientY,
            screenX: e.screenX,
            screenY: e.screenY,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
            meta: e.metaKey,
        }, '*');

        __dragPointerId = null;
    });
    `;
    iframe.contentDocument.head.appendChild(document.createElement("script")).textContent = script;
    loadOverlay.remove();
    setTimeout(() => {
        const canvas = iframe.contentDocument.querySelector('canvas');
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            canvas.requestPointerLock();
        });
    }, 10000);
    iframe.tabIndex = 0;
};