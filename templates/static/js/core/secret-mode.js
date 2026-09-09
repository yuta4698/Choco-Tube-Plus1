(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var SHELL_KEY = 'choco-secret-shell';
  var VISIT_KEY = 'choco-visit-unlocked';
  var ON = 'on';
  var SHELL_NAME = 'chocoSecretShell';

  function isEnabled() {
    // Secret mode is ON by default. The sidebar button can explicitly turn it OFF.
    return localStorage.getItem(STORAGE_KEY) !== 'off';
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
        sessionStorage.setItem(VISIT_KEY, ON);
        url.searchParams.delete('__secret_shell');
        history.replaceState({}, '', url.pathname + url.search + url.hash);
        return true;
      }
    } catch (e) {}
    return isShellPage();
  }

  function markAuthenticatedVisit() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('__secret_auth') === '1') {
        sessionStorage.setItem(VISIT_KEY, ON);
        url.searchParams.delete('__secret_auth');
        history.replaceState({}, '', url.pathname + url.search + url.hash);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function hasUnlockedVisit() {
    try {
      return sessionStorage.getItem(VISIT_KEY) === ON;
    } catch (e) {
      return false;
    }
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

  function closeSecretShell() {
    try {
      var shell = window.open('', SHELL_NAME);
      if (shell && !shell.closed) shell.close();
    } catch (e) {}
  }

  function openSecretShell() {
    var shell = window.open('about:blank', SHELL_NAME);
    if (!shell) return false;

    var siteUrl = addShellParam(window.location.origin + window.location.pathname + window.location.search + window.location.hash);
    var html = '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private Access</title><style>' +
      'html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}' +
      'iframe{border:0;width:100%;height:100%;display:block}' +
      '</style></head><body>' +
      '<iframe id="secretSiteFrame" src="' + siteUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
      '<script>window.addEventListener("message",function(e){if(e.data&&e.data.type==="choco-secret-off"){try{window.close()}catch(_){}}});<\\/script>' +
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

  function disableSecretMode(btn) {
    var ok = window.confirm('シークレットモードをOFFにすると、通常モードで開いた動画は履歴に残ります。\n\nシークレットモードをOFFにしますか？');
    if (!ok) return;

    localStorage.setItem(STORAGE_KEY, 'off');
    updateButton(btn);

    if (isShellPage()) {
      try { window.parent.postMessage({ type: 'choco-secret-off' }, '*'); } catch (e) {}
    } else {
      closeSecretShell();
    }
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.secretBound === '1') return;
    btn.dataset.secretBound = '1';
    updateButton(btn);
    btn.addEventListener('click', function () {
      if (isEnabled()) {
        disableSecretMode(btn);
        return;
      }

      localStorage.setItem(STORAGE_KEY, ON);
      updateButton(btn);
      if (!isShellPage()) openSecretShell();
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
    var authenticated = markAuthenticatedVisit();

    // A fresh browser tab/window must pass through the existing password page first.
    // The shell itself is exempt because it carries the secret-shell session marker.
    if (!shellPage && !isShellPage() && !authenticated && !hasUnlockedVisit()) {
      window.location.replace('/login');
      return;
    }

    if (!isEnabled() || shellPage || isShellPage()) return;

    // After successful password authentication, open the site inside about:blank.
    if (authenticated || !isShellPage()) {
      openSecretShell();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
    startSecretMode();
  });

  addButton();
  startSecretMode();
})();
