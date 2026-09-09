(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var SHELL_KEY = 'choco-secret-shell';
  var VISIT_KEY = 'choco-visit-unlocked';
  var ON = 'on';
  var SHELL_NAME = 'chocoSecretShell';
  var GOOGLE_URL = 'https://www.google.com/search?q=';
  var started = false;

  function isEnabled() { return localStorage.getItem(STORAGE_KEY) !== 'off'; }
  function isShellPage() { try { return sessionStorage.getItem(SHELL_KEY) === ON; } catch (e) { return false; } }
  function hasUnlockedVisit() { try { return sessionStorage.getItem(VISIT_KEY) === ON; } catch (e) { return false; } }

  function markShellPage() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('__secret_shell') === '1') {
        sessionStorage.setItem(SHELL_KEY, ON);
        sessionStorage.setItem(VISIT_KEY, ON);
        u.searchParams.delete('__secret_shell');
        history.replaceState({}, '', u.pathname + u.search + u.hash);
        return true;
      }
    } catch (e) {}
    return isShellPage();
  }

  function markAuthenticatedVisit() {
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('__secret_auth') === '1') {
        sessionStorage.setItem(VISIT_KEY, ON);
        u.searchParams.delete('__secret_auth');
        history.replaceState({}, '', u.pathname + u.search + u.hash);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function goGoogle() { location.replace(GOOGLE_URL); }

  function makeShellUrl() {
    var u = new URL(location.origin + location.pathname + location.search + location.hash);
    u.searchParams.set('__secret_shell', '1');
    return u.href;
  }

  function openSecretShell() {
    var shell = window.open('about:blank', SHELL_NAME);
    if (!shell) return false;
    var src = makeShellUrl().replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    var origin = location.origin.replace(/"/g, '&quot;');
    var html = '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>about:blank</title><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style></head><body>' +
      '<iframe id="secretSiteFrame" src="' + src + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '<script>window.addEventListener("message",function(e){if(e.data&&e.data.type==="choco-secret-off"){location.replace("' + origin + '/");}});<\\/script>' +
      '</body></html>';
    try {
      shell.document.open();
      shell.document.write(html);
      shell.document.close();
      shell.focus();
      return true;
    } catch (e) { return false; }
  }

  function updateButton(btn) {
    var on = isEnabled();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('secret-mode-on', on);
    var label = btn.querySelector('[data-secret-label]');
    if (label) label.textContent = on ? 'シークレット ON' : 'シークレット OFF';
    btn.title = on ? 'シークレットモード：ON（about:blankで開きます）' : 'シークレットモード：OFF';
  }

  function disableSecretMode(btn) {
    if (!confirm('シークレットモードをOFFにしますか？')) return;
    localStorage.setItem(STORAGE_KEY, 'off');
    updateButton(btn);
    if (isShellPage()) {
      try { parent.postMessage({ type: 'choco-secret-off' }, '*'); } catch (e) { location.replace('/'); }
    } else {
      try { var w = window.open('', SHELL_NAME); if (w && !w.closed) w.close(); } catch (e) {}
      location.replace('/');
    }
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.secretBound === '1') return;
    btn.dataset.secretBound = '1';
    updateButton(btn);
    btn.addEventListener('click', function () {
      if (isEnabled()) disableSecretMode(btn);
      else {
        localStorage.setItem(STORAGE_KEY, ON);
        updateButton(btn);
        if (!isShellPage()) openSecretShell();
      }
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
    var shell = markShellPage();
    var auth = markAuthenticatedVisit();

    // A fresh normal tab is redirected before protected page content can be used.
    if (!shell && !isShellPage() && !auth && !hasUnlockedVisit()) {
      location.replace('/login');
      return;
    }
    if (!isEnabled() || shell || isShellPage()) return;

    var opened = openSecretShell();
    if (auth && opened) goGoogle();
  }

  document.addEventListener('DOMContentLoaded', function () { addButton(); start(); });
  addButton();
  start();
})();