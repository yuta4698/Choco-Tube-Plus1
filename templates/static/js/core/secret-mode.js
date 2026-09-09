(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var SHELL_KEY = 'choco-secret-shell';
  var VISIT_KEY = 'choco-visit-unlocked';
  var ON = 'on';
  var OFF = 'off';
  var SHELL_NAME = 'chocoSecretShell';
  var GOOGLE_URL = 'https://www.google.com/';
  var started = false;

  function isEnabled() {
    try { return localStorage.getItem(STORAGE_KEY) !== OFF; }
    catch (e) { return true; }
  }

  function setEnabled(enabled) {
    try { localStorage.setItem(STORAGE_KEY, enabled ? ON : OFF); } catch (e) {}
  }

  function isShellFrame() {
    return window.top !== window.self;
  }

  function markShellFrame() {
    if (!isShellFrame()) return false;
    try {
      sessionStorage.setItem(SHELL_KEY, ON);
      var u = new URL(location.href);
      if (u.searchParams.get('__secret_shell') === '1') {
        u.searchParams.delete('__secret_shell');
        history.replaceState({}, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
    return true;
  }

  function updateButton(btn) {
    var on = isEnabled();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('secret-mode-on', on);
    var label = btn.querySelector('[data-secret-label]');
    if (label) label.textContent = on ? 'シークレット ON' : 'シークレット OFF';
    btn.title = on ? 'シークレットモード：ON' : 'シークレットモード：OFF';
  }

  function shellReturnPath() {
    var u = new URL(location.href);
    u.searchParams.delete('__secret_shell');
    return u.pathname + u.search + u.hash;
  }

  function buildShell(targetPath) {
    var shell = window.open('about:blank', SHELL_NAME, 'popup');
    if (!shell) {
      window.alert('シークレット画面を開けませんでした。ブラウザのポップアップブロックを解除してください。');
      return null;
    }

    var origin = location.origin;
    var frameUrl = origin + (targetPath || '/') + (targetPath && targetPath.indexOf('?') >= 0 ? '&' : '?') + '__secret_shell=1';
    var html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>about:blank</title>' +
      '<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{display:block;width:100%;height:100%;border:0}</style>' +
      '</head><body><iframe id="secretFrame" src="' + frameUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" allow="autoplay; fullscreen; picture-in-picture"></iframe>' +
      '<script>window.addEventListener("message",function(e){if(e.origin!==location.origin)return;if(!e.data||e.data.type!=="choco-secret-off")return;try{localStorage.setItem("choco-secret-mode","off")}catch(x){};var p=e.data.path||"/";if(p.charAt(0)!=="/")p="/";location.replace(location.origin+p)});<\/script>' +
      '</body></html>';
    shell.document.open();
    shell.document.write(html);
    shell.document.close();
    try { shell.focus(); } catch (e) {}
    return shell;
  }

  function enableSecretMode(btn) {
    setEnabled(true);
    updateButton(btn);

    if (isShellFrame()) {
      location.reload();
      return;
    }

    var shell = buildShell(shellReturnPath());
    if (!shell) {
      setEnabled(false);
      updateButton(btn);
      return;
    }

    // Replace the original tab's Choco-Tube entry with Google.
    setTimeout(function () {
      try { location.replace(GOOGLE_URL); }
      catch (e) { location.href = GOOGLE_URL; }
    }, 0);
  }

  function disableSecretMode(btn) {
    if (!window.confirm('シークレットモードをOFFにしますか？')) return;
    setEnabled(false);
    updateButton(btn);

    if (isShellFrame()) {
      // Keep this top-level about:blank tab authenticated when it becomes
      // a normal Choco-Tube page after the shell is disabled.
      try { sessionStorage.setItem(VISIT_KEY, ON); } catch (e) {}
      try {
        window.parent.postMessage({ type: 'choco-secret-off', path: shellReturnPath() }, location.origin);
      } catch (e) {
        location.reload();
      }
      return;
    }

    location.reload();
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.secretBound === '1') return;
    btn.dataset.secretBound = '1';
    updateButton(btn);
    btn.addEventListener('click', function () {
      if (isEnabled()) disableSecretMode(btn);
      else enableSecretMode(btn);
    });
  }

  function addButton() {
    var btn = document.getElementById('secretModeBtn');
    if (btn) return bindButton(btn);
    var footer = document.querySelector('.sidebar-footer');
    if (!footer) return;
    btn = document.createElement('button');
    btn.id = 'secretModeBtn';
    btn.className = 'sidebar-theme-btn secret-mode-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="secret-lock">◉</span><span data-secret-label></span>';
    bindButton(btn);
    footer.insertBefore(btn, footer.firstChild);
  }

  function start() {
    if (started) return;
    started = true;

    var shellFrame = markShellFrame();
    if (!shellFrame) {
      var unlocked = false;
      try { unlocked = sessionStorage.getItem(VISIT_KEY) === ON; } catch (e) {}
      if (!unlocked) {
        location.replace('/login');
        return;
      }
    }

    try {
      var u = new URL(location.href);
      if (u.searchParams.get('__secret_auth') === '1') {
        sessionStorage.setItem(VISIT_KEY, ON);
        u.searchParams.delete('__secret_auth');
        history.replaceState({}, '', u.pathname + u.search + u.hash);
      }
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
    start();
  });
  addButton();
  start();
})();
