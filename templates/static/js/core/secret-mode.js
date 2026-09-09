(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var SHELL_KEY = 'choco-secret-shell';
  var SHELL_PARAM = '__secret_shell=1';
  var ON = 'on';

  function isEnabled() {
    return localStorage.getItem(STORAGE_KEY) === ON;
  }

  function isShellPage() {
    try {
      return sessionStorage.getItem(SHELL_KEY) === ON;
    } catch (e) {
      return false;
    }
  }

  function markShellPage() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('__secret_shell') === '1') {
        sessionStorage.setItem(SHELL_KEY, ON);
        url.searchParams.delete('__secret_shell');
        history.replaceState({}, '', url.pathname + url.search + url.hash);
        return true;
      }
    } catch (e) {}
    return isShellPage();
  }

  function addShellParam(url) {
    try {
      var u = new URL(url, window.location.origin);
      u.searchParams.set('__secret_shell', '1');
      return u.href;
    } catch (e) {
      return url;
    }
  }

  function openSecretShell() {
    var shell = window.open('about:blank', '_blank');
    if (!shell) return false;

    var siteUrl = addShellParam(window.location.href);
    var html = '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choco-tube-plus</title><style>' +
      'html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}' +
      'iframe{border:0;width:100%;height:100%;display:block}' +
      '</style></head><body>' +
      '<iframe src="' + siteUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '</body></html>';

    try {
      shell.document.open();
      shell.document.write(html);
      shell.document.close();
      try { shell.history.replaceState({}, '', 'about:blank'); } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateButton(btn) {
    var enabled = isEnabled();
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.classList.toggle('secret-mode-on', enabled);
    var label = btn.querySelector('[data-secret-label]');
    if (label) label.textContent = enabled ? 'シークレット ON' : 'シークレット OFF';
    btn.title = enabled ? 'シークレットモード：ON（サイトをabout:blankで開きます）' : 'シークレットモード：OFF';
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.secretBound === '1') return;
    btn.dataset.secretBound = '1';
    updateButton(btn);
    btn.addEventListener('click', function () {
      var nextEnabled = !isEnabled();
      localStorage.setItem(STORAGE_KEY, nextEnabled ? ON : 'off');
      updateButton(btn);

      if (nextEnabled && !isShellPage()) {
        openSecretShell();
      }
    });
  }

  function addButton() {
    var existing = document.getElementById('secretModeBtn');
    if (existing) {
      bindButton(existing);
      return;
    }

    var footer = document.querySelector('.sidebar-footer');
    if (!footer) return;

    var btn = document.createElement('button');
    btn.id = 'secretModeBtn';
    btn.className = 'sidebar-theme-btn secret-mode-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="secret-lock">◉</span><span data-secret-label></span>';
    bindButton(btn);
    footer.insertBefore(btn, footer.firstChild);
  }

  function startSecretMode() {
    var shellPage = markShellPage();
    if (!isEnabled() || shellPage || isShellPage()) return;

    // When secret mode is already ON, open the site inside an about:blank shell
    // immediately. Video links inside the shell are left completely untouched.
    openSecretShell();
  }

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
    startSecretMode();
  });

  addButton();
  startSecretMode();
})();
