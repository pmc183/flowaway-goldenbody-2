// Ensure this pre-init block runs only once even if the script is injected twice
window.protectedGlobals = {};
window.persistGlobals = window.persistGlobals || {};
if (!document.body) {
  document.documentElement.appendChild(document.createElement('body'));
}
if (!window.persistGlobals.__ouchbad_preinit_done) {
  window.persistGlobals.__ouchbad_preinit_done = true;
  window.persistGlobals.__ouchbad_BASE = window.origin;
  window.persistGlobals.__ouchbad_goldenbodywebsite = window.persistGlobals.__ouchbad_BASE + '/';
  window.persistGlobals.__ouchbad_zmcdserver = `${window.persistGlobals.__ouchbad_BASE}/server/zmcd`;
  window.persistGlobals.__ouchbad_SERVER = `${window.persistGlobals.__ouchbad_BASE}/server/fetchfiles/`;
  window.persistGlobals.__ouchbad_downloadserver = `${window.persistGlobals.__ouchbad_BASE}/server/download/`;
  let __ouchbad_openerOrigin = null;
  try {
    if (window.opener && window.opener.location && window.opener.location.origin) {
      __ouchbad_openerOrigin = window.opener.location.origin;
    }
  } catch (e) {
    __ouchbad_openerOrigin = null;
  }
  window.persistGlobals.__ouchbad_baseOrigin = __ouchbad_openerOrigin || window.location.origin;
  window.persistGlobals.__ouchbad_wsProtocol = window.persistGlobals.__ouchbad_baseOrigin.startsWith('https') ? 'wss://' : 'ws://';
  window.persistGlobals.__ouchbad_hostname = new URL(window.persistGlobals.__ouchbad_baseOrigin).hostname;
}
window.protectedGlobals.filePost = async function (data) {
  const headers = { 'Content-Type': 'application/json' };
  headers.Authorization = 'Bearer ' + window.protectedGlobals.data.authToken;
  const res = await fetch(window.protectedGlobals.SERVER, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: window.protectedGlobals.data.username ? window.protectedGlobals.data.username : '', ...data }),
  });
  return res.text();
};
window.protectedGlobals.BASE = window.persistGlobals.__ouchbad_BASE;
window.protectedGlobals.goldenbodywebsite = window.persistGlobals.__ouchbad_goldenbodywebsite;
window.protectedGlobals.zmcdserver = window.persistGlobals.__ouchbad_zmcdserver;
window.protectedGlobals.SERVER = window.persistGlobals.__ouchbad_SERVER;
window.protectedGlobals.downloadserver = window.persistGlobals.__ouchbad_downloadserver;
window.protectedGlobals.baseOrigin = window.persistGlobals.__ouchbad_baseOrigin;
window.protectedGlobals.wsProtocol = window.persistGlobals.__ouchbad_wsProtocol;
window.protectedGlobals.hostname = window.persistGlobals.__ouchbad_hostname;
window.protectedGlobals.zmcdata = null;
window.protectedGlobals.firstlogin = false;

(() => {
  let succeeded = false;
  document.body.style.background = '#0f0f0f';
  document.body.style.color = '#fff';
  document.body.style.fontFamily = 'Arial, sans-serif';
  document.body.style.margin = '0';
  document.body.style.minHeight = '100vh';
  document.body.style.display = 'block';
  document.body.style.boxSizing = 'border-box';

  let shell = document.createElement('div');
  shell.style.minHeight = '100vh';
  shell.style.display = 'flex';
  shell.style.alignItems = 'center';
  shell.style.justifyContent = 'center';
  shell.style.boxSizing = 'border-box';
  shell.style.padding = '24px 0';

  let box = document.createElement('div');
  box.style.width = 'min(440px, calc(100vw - 22px))';
  box.style.margin = '0';
  box.style.padding = '12px 14px 10px';
  box.style.background = '#2c2f33';
  box.style.borderRadius = '16px';
  box.style.border = '2px solid rgba(255,255,255,0.06)';
  box.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.03), 0 12px 28px rgba(0,0,0,0.35)';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.alignItems = 'stretch';
  box.style.color = '#f3f6f8';

  box.innerHTML = `
    <div style="text-align:center; margin-bottom:6px;">
      <h1 style="margin:0; font-size:clamp(1.45rem, 2.2vw, 2.1rem); line-height:1.15; font-weight:500; letter-spacing:-0.04em; color:#f2f3f5;">Welcome Back</h1>
      <div style="margin-top:6px; font-size:clamp(0.82rem, 1vw, 0.96rem); line-height:1.25; font-weight:400; color:#e7ebef; opacity:0.92;">Log in to access your account</div>
    </div>

    <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
      <div>
        <label for="zmc-user" style="display:block; margin:0 0 4px; font-size:clamp(0.72rem, 1vw, 0.86rem); font-weight:700; color:#f5f7fa;">Username</label>
        <input id="zmc-user" placeholder="Enter username" style="width:100%;height:38px;padding:0 10px;box-sizing:border-box;border:none;border-radius:9px;background:#dfe3e8;color:#2d3034;font-size:clamp(0.82rem, 0.9vw, 0.96rem);outline:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.04);">
      </div>

      <div>
        <label for="zmc-pass" style="display:block; margin:0 0 4px; font-size:clamp(0.72rem, 1vw, 0.86rem); font-weight:700; color:#f5f7fa;">
          Password
        </label>

        <div style="position:relative; width:100%;">
          <input
            id="zmc-pass"
            type="password"
            placeholder="Enter password"
            style="width:100%; height:38px; padding:0 40px 0 10px; box-sizing:border-box; border:none; border-radius:9px; background:#dfe3e8; color:#2d3034; font-size:clamp(0.82rem, 0.9vw, 0.96rem); outline:none; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.04);"
          >

          <button
            type="button"
            aria-label="Show password"
            id="zmc-pass-toggle"
            style="position:absolute; right:10px; top:50%; transform:translateY(-50%); border:none; background:transparent; padding:4px; cursor:pointer; color:#555b63; display:flex; align-items:center; justify-content:center;"
          >
            <svg id="zmc-eye-icon" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3l18 18"/>
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
              <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3 3.8"/>
              <path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4.1-.8"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <button id="zmc-login" style="width:100%;margin-top:10px;height:40px;border:none;border-radius:9px;background:#2f7fe8;color:#f5f7fa;font-size:clamp(0.9rem, 1.2vw, 1.05rem);font-weight:800;letter-spacing:0.02em;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,0.15);">LOG IN</button>

    <label style="display:flex;align-items:flex-start;gap:8px;width:100%;margin-top:10px;font-size:13px;line-height:1.4;color:#dfe7f1;">
      <input id="zmc-consent" type="checkbox" style="margin-top:2px;flex-shrink:0;">
      <span>By continuing, I agree the <a href="termsofservice.html" target="_blank" rel="noreferrer" style="color:#7dd3fc;">Terms of Service</a> and <a href="privacypolicy.html" target="_blank" rel="noreferrer" style="color:#7dd3fc;">Privacy Policy</a>.</span>
    </label>

    <div id="zmc-msg" style="margin-top:6px;font-size:12px;text-align:center;min-height:16px;color:#f4f7fa;"></div>

    <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.08);">
      <div style="text-align:center; font-size:clamp(0.8rem, 0.9vw, 0.9rem); color:#f0f4f7; margin-bottom:8px;">Don't have an account yet?</div>
      <button id="zmc-register" style="width:100%;height:40px;border:none;border-radius:9px;background:#3b9f59;color:#f5f7fa;font-size:clamp(0.9rem, 1.2vw, 1.05rem);font-weight:800;letter-spacing:0.02em;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,0.15);">CREATE YOUR ACCOUNT</button>
    </div>

    <div style="margin-top:10px; text-align:center; font-size:clamp(0.8rem, 0.9vw, 0.9rem); line-height:1.35; color:#f4f7fa; opacity:0.9;">
      Account recovery options are available below.
    </div>

    <div style="margin-top:10px;width:100%;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
      <h3 style="margin:0 0 6px;text-align:center;font-size:clamp(0.9rem, 1vw, 1.02rem);color:#f2f6f8;">Account Repair</h3>
      <button id="recovery-load" style="width:100%;margin-top:5px; height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">
        Load Recovery Options
      </button>
      <button id="update-system" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Update System</button>
      <select id="recovery-app-select" style="width:100%;padding:7px 8px;margin:5px 0;box-sizing:border-box;display:block;border-radius:7px;border:1px solid rgba(255,255,255,0.08);background:#f3f5f7;color:#1d2024;font-size:0.75rem;">
        <option value="" disabled selected>Enter recovery credentials to load system apps</option>
      </select>
      <button id="recovery-reset" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Reset selected system app</button>
      <select id="recovery-delete-app-select" style="width:100%;padding:7px 8px;margin:5px 0;box-sizing:border-box;display:block;border-radius:7px;border:1px solid rgba(255,255,255,0.08);background:#f3f5f7;color:#1d2024;font-size:0.75rem;">
        <option value="" disabled selected>Enter recovery credentials to load non-system apps</option>
      </select>
      <button id="recovery-delete-app" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Delete selected non-system app</button>
      <button id="recovery-reset-systemfiles" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Reset /systemfiles</button>
      <button id="recovery-reset-pathperm" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Reset path permissions</button>
      <button id="recovery-repair-system" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Repair system files</button>
      <button id="recovery-jskeys" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Restore all JS keys</button>
      <button id="recovery-delete" style="width:100%;margin-top:5px;height:28px;border:none;border-radius:7px;background:#f1f5f9;color:#1a1d22;font-size:0.78rem;font-weight:600;cursor:pointer;">Delete account</button>
    </div>
  `;

  function togglePassword() {
    const password = document.getElementById('zmc-pass');
    const button = document.getElementById('zmc-pass-toggle');
    const icon = document.getElementById('zmc-eye-icon');

    if (password.type === 'password') {
      password.type = 'text';
      button.setAttribute('aria-label', 'Hide password');

      icon.innerHTML = `
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    } else {
      password.type = 'password';
      button.setAttribute('aria-label', 'Show password');
      icon.innerHTML = `
        <path d="M3 3l18 18"/>
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/>
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3 3.8"/>
        <path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4.1-.8"/>
      `;
    }
  }
  document.body.innerHTML = '';
  document.body.appendChild(shell);
  shell.appendChild(box);
  document.getElementById('zmc-pass-toggle').addEventListener('click', togglePassword);

  const msg = document.getElementById('zmc-msg');
  const recoveryAppSelect = document.getElementById('recovery-app-select');
  const recoveryDeleteAppSelect = document.getElementById('recovery-delete-app-select');
  const recoveryUserInput = document.getElementById('zmc-user');
  const recoveryPassInput = document.getElementById('zmc-pass');
  const consentCheckbox = document.getElementById('zmc-consent');

  function setStatusMessage(el, text, color = '#f4f7fa') {
    el.textContent = text;
    el.style.color = color;
    el.style.fontSize = '12px';
    el.style.fontWeight = '600';
    el.style.lineHeight = '1.5';
    el.style.textAlign = 'center';
    el.style.minHeight = '18px';
    el.style.display = 'block';
  }

  function resetSelectPlaceholder(select, message) {
    select.innerHTML = `<option value="" disabled selected>${message}</option>`;
    select.style.display = 'block';
    select.disabled = true;
  }

  function downloadBase64Zip(base64Data, fileName) {
    const bytes = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/zip' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  document.getElementById('recovery-load').onclick = async () => {
    setStatusMessage(msg, 'Loading available apps...', '#ffd166');

    await ensureRecoveryCatalog(true);
  };
  document.getElementById('update-system').onclick = async () => {
    setStatusMessage(msg, 'Updating system...', '#ffd166');
    const username = document.getElementById('zmc-user').value;
    const password = document.getElementById('zmc-pass').value;

    let result = null;
    try {
      const res = await fetch('/server/updatesystem?forceUpdate=true', {
        method: 'POST',
        headers: {
          'X-Username': username,
          'X-Password': password
        }
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
      result = { ok: false, updated: false, reason: 'server_error' };
    }

    const message = (() => {
      if (!result || typeof result !== 'object') return 'Failed to update system';
      if (result.updated) return 'System updated successfully.';
      if (result.reason === 'unauthorized') return 'Authentication failed.';
      if (result.reason === 'missing_username') return 'Missing username.';
      if (result.reason === 'server_error') return 'Server error while updating system.';
      return result.reason || 'Failed to update system';
    })();

    setStatusMessage(msg, message, result && result.ok && result.updated ? 'lime' : result && result.ok ? '#ffd166' : 'red');
  };
  function populateSelect(select, items, emptyMessage) {
    if (!items || !items.length) {
      resetSelectPlaceholder(select, emptyMessage);
      return;
    }
    select.innerHTML = items.map((app) => `<option value="${app.id}">${app.label} (${app.folderName})</option>`).join('');
    select.style.display = 'block';
    select.disabled = false;
  }

  resetSelectPlaceholder(recoveryAppSelect, 'Enter recovery username/password to load system apps');
  resetSelectPlaceholder(recoveryDeleteAppSelect, 'Enter recovery username/password to load non-system apps');

  const recoveryServerUrl = (() => {
    const baseUrl = new URL(window.persistGlobals.__ouchbad_BASE);
    return `${baseUrl.origin}/server/systemRecovery`;
  })();
  window.protectedGlobals.recoveryserver = recoveryServerUrl;

  async function sendRecoveryRequest(action, extraPayload) {
    const username = document.getElementById('zmc-user').value;
    const password = document.getElementById('zmc-pass').value;

    if (!username || !password) {
      setStatusMessage(msg, 'Fill recovery username and password', 'red');
      return null;
    }

    const payload = {
      username,
      password,
      action,
      ...extraPayload,
    };

    try {
      const res = await fetch(window.protectedGlobals.recoveryserver, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return { error: 'Server error' };
    }
  }

  async function ensureRecoveryCatalog(forceReload = false) {
    if (!forceReload && !recoveryAppSelect.disabled && !recoveryDeleteAppSelect.disabled) return;
    resetSelectPlaceholder(recoveryAppSelect, 'Loading available system apps...');
    resetSelectPlaceholder(recoveryDeleteAppSelect, 'Loading available non-system apps...');
    const result = await sendRecoveryRequest('list');
    if (!result || result.error) {
      setStatusMessage(msg, result && result.error ? result.error : 'Unable to load recovery options', 'red');
      resetSelectPlaceholder(recoveryAppSelect, 'Unable to load system apps');
      resetSelectPlaceholder(recoveryDeleteAppSelect, 'Unable to load non-system apps');
      return;
    }

    populateSelect(recoveryAppSelect, result.systemApps, 'No system apps found');
    populateSelect(recoveryDeleteAppSelect, result.nonSystemApps, 'No non-system apps found');
    if (result.systemApps.length || result.nonSystemApps.length) {
      setStatusMessage(msg, '', '#f4f7fa');
    }
  }
  function startUp() {
    setTimeout(async () => {
      const a = document.createElement('script');
      const res = await window.protectedGlobals.filePost({ requestFile: true, requestFileName: 'systemfiles/runtime/core/flowaway.js', text: true });
      a.textContent = res;
      document.body.appendChild(a);
      shell.remove();
      // wipe shell from memory
      shell.innerHTML = '';
      shell = null;
    });
  }

  async function send(needNewAcc) {
    const username = document.getElementById('zmc-user').value;
    const password = document.getElementById('zmc-pass').value;

    if (needNewAcc && !consentCheckbox.checked) {
      msg.textContent = 'You must agree to the Terms of Service and Privacy Policy before creating an account.';
      msg.style.color = 'red';
      return;
    }

    if (!username || !password) {
      msg.textContent = 'Fill all fields';
      msg.style.color = 'red';
      return;
    }

    if (username.length > 20 || username.length < 3) {
      msg.textContent = 'username is 3 to 20 characters';
      msg.style.color = 'red';
      return;
    }
    if (username.includes(' ')) {
      msg.textContent = 'username cannot contain spaces';
      msg.style.color = 'red';
      return;
    }
    if (password.length > 20 || password.length < 3) {
      msg.textContent = 'password is 3 to 20 characters';
      msg.style.color = 'red';
      return;
    }

    const payload = {
      username,
      password,
      id: '',
      needNewAcc,
    };

    return fetch(window.protectedGlobals.zmcdserver, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        let result;
        try {
          result = await response.json();
        } catch (err) {
          result = await response.text().catch(() => null);
        }
          if (result?.error === 'Invalid username format') {
            result.error = 'Invalid username format. Username can only contain letters and numbers.';
          }
        window.protectedGlobals.zmcdata = result;
        const errorMessage = result && typeof result === 'object' && typeof result.error === 'string'
          ? result.error
          : typeof result === 'string' && result.startsWith('error:')
            ? result
            : null;

        if (errorMessage || (response && !response.ok)) {
          msg.textContent = errorMessage || `Server error (${response.status})`;
          msg.style.color = 'red';
          return;
        }

        msg.textContent = 'Success! Waiting for system to load...';
        msg.style.color = 'lime';
        succeeded = true;
        await fetch('/server/updatesystem', {
          method: 'POST',
          headers: {
            'X-Username': username,
            'X-Password': password
          }
        });
        window.protectedGlobals.data = window.protectedGlobals.zmcdata;
        if (!window.protectedGlobals.firstlogin && String(window.protectedGlobals.data.username ? window.protectedGlobals.data.username : '').startsWith('183')) {
          window.protectedGlobals.firstlogin = true;
        }
        setTimeout(() => {
          window.protectedGlobals.isRebuilding = false;
        }, 2000);
        startUp();
      })
      .catch((err) => {
        console.error(err);
        msg.textContent = 'Server error, try create acc first before login!';
        msg.style.color = 'red';
      });
  }

  const disableButtons = () => {
    const login = document.getElementById('zmc-login');
    login.style.cursor = 'not-allowed';
    login.style.opacity = '0.6';
    login.textContent = 'Please wait...';
    login.disabled = true;
    const register = document.getElementById('zmc-register');
    register.style.cursor = 'not-allowed';
    register.style.opacity = '0.6';
    register.disabled = true;
  };
  const enableButtons = () => {
    if (succeeded) {
      return;
    }
    const login = document.getElementById('zmc-login');
    login.disabled = false;
    login.style.cursor = 'pointer';
    login.style.opacity = '1';
    login.textContent = 'LOG IN';
    const register = document.getElementById('zmc-register');
    register.style.cursor = 'pointer';
    register.style.opacity = '1';
    register.disabled = false;
  }
  document.getElementById('zmc-login').onclick = async () => {
    disableButtons();
    try {
      await send(false);
    }
    finally {
      enableButtons();
    }
  };
  document.getElementById('zmc-register').onclick = async () => {
    disableButtons();
    try {
      await send(true);
    }
    finally {
      enableButtons();
    }
  };

  function confirmAccountDeletion() {
    return new Promise((resolve) => {
      let settled = false;

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:rgba(0,0,0,0.72);';

      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'zmc-delete-title');
      dialog.style.cssText = 'width:min(360px,calc(100vw - 32px));box-sizing:border-box;padding:18px;border-radius:12px;background:#34383d;color:#f4f7fa;border:1px solid rgba(255,255,255,0.12);box-shadow:0 18px 48px rgba(0,0,0,0.55);';

      dialog.innerHTML = `
        <h2 id="zmc-delete-title" style="margin:0 0 8px;font-size:18px;line-height:1.3;">Delete account?</h2>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#e2e6ea;">This permanently deletes the account and its data. This action cannot be undone.</p>
        <div style="display:flex;gap:8px;">
          <button id="zmc-delete-cancel" type="button" style="flex:1;height:38px;border:1px solid rgba(255,255,255,0.14);border-radius:8px;background:#50555b;color:#fff;font-weight:700;cursor:pointer;">Cancel</button>
          <button id="zmc-delete-confirm" type="button" style="flex:1;height:38px;border:none;border-radius:8px;background:#dc3545;color:#fff;font-weight:800;cursor:pointer;">Delete Account</button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const cancelButton = dialog.querySelector('#zmc-delete-cancel');
      const confirmButton = dialog.querySelector('#zmc-delete-confirm');

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      };

      const finish = (confirmed) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', handleKeyDown);
        overlay.remove();
        resolve(confirmed);
      };

      cancelButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      };
      confirmButton.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
      };
      overlay.onclick = (event) => {
        if (event.target === overlay) finish(false);
      };

      document.addEventListener('keydown', handleKeyDown);
      cancelButton.focus();
    });
  }

  document.getElementById('recovery-delete').onclick = async () => {
    const confirmed = await confirmAccountDeletion();
    if (!confirmed) {
      setStatusMessage(msg, 'Account deletion cancelled.', '#ffd166');
      return;
    }

    setStatusMessage(msg, 'Sending recovery request...', '#ffd166');
    const result = await sendRecoveryRequest('deleteAccount');
    if (result && result.success) {
      setStatusMessage(msg, 'Account deleted.', 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to delete account', 'red');
    }
  };

  document.getElementById('recovery-jskeys').onclick = async () => {
    setStatusMessage(msg, 'Restoring JS keys...', '#ffd166');
    const result = await sendRecoveryRequest('restoreSystemJsKeys');
    if (result && result.success) {
      setStatusMessage(msg, `Restored ${result.restoredCount || 0} system app JS keys.`, 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to restore JS keys', 'red');
    }
  };

  document.getElementById('recovery-reset').onclick = async () => {
    if (!recoveryAppSelect.value) {
      setStatusMessage(msg, 'No system app selected', 'red');
      return;
    }
    const selectedAppId = recoveryAppSelect.value;
    setStatusMessage(msg, 'Resetting system app...', '#ffd166');
    const result = await sendRecoveryRequest('resetSystemApp', { appIdentifier: selectedAppId });
    if (result && result.success) {
      if (result.backupData) {
        downloadBase64Zip(result.backupData, result.backupFileName || `${selectedAppId}.zip`);
      }
      setStatusMessage(msg, result.backupData
        ? `${result.app && result.app.label ? result.app.label : selectedAppId} was reset. Backup downloaded.`
        : `${result.app && result.app.label ? result.app.label : selectedAppId} was reset.`, 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to reset system app', 'red');
    }
  };

  document.getElementById('recovery-delete-app').onclick = async () => {
    if (!recoveryDeleteAppSelect.value) {
      setStatusMessage(msg, 'No non-system app selected', 'red');
      return;
    }
    const selectedAppId = recoveryDeleteAppSelect.value;
    setStatusMessage(msg, 'Deleting selected app...', '#ffd166');
    const result = await sendRecoveryRequest('deleteUserApp', { appIdentifier: selectedAppId });
    if (result && result.success) {
      setStatusMessage(msg, `${result.app && result.app.label ? result.app.label : selectedAppId} was deleted.`, 'lime');
      await ensureRecoveryCatalog(true);
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to delete app', 'red');
    }
  };

  document.getElementById('recovery-repair-system').onclick = async () => {
    setStatusMessage(msg, 'Repairing system files...', '#ffd166');
    const result = await sendRecoveryRequest('repairSystemFiles');
    if (result && result.success) {
      if (result.backupData) {
        downloadBase64Zip(result.backupData, result.backupFileName || 'systemfiles-repair-backup.zip');
      }
      setStatusMessage(msg, result.backupData
        ? 'System files repaired. Backup downloaded.'
        : 'System files repaired.', 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to repair system files', 'red');
    }
  };

  document.getElementById('recovery-reset-systemfiles').onclick = async () => {
    setStatusMessage(msg, 'Resetting /systemfiles...', '#ffd166');
    const result = await sendRecoveryRequest('resetSystemFiles');
    if (result && result.success) {
      if (result.backupData) {
        downloadBase64Zip(result.backupData, result.backupFileName || 'systemfiles-backup.zip');
      }
      setStatusMessage(msg, result.backupData
        ? 'System files reset. Backup downloaded as ZIP.'
        : 'System files reset.', 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to reset system files', 'red');
    }
  };

  document.getElementById('recovery-reset-pathperm').onclick = async () => {
    setStatusMessage(msg, 'Resetting path permissions...', '#ffd166');
    const result = await sendRecoveryRequest('resetPathPermissions');
    if (result && result.success) {
      setStatusMessage(msg, 'Path permissions reset.', 'lime');
    } else {
      setStatusMessage(msg, result && result.error ? result.error : 'Failed to reset path permissions', 'red');
    }
  };
})();