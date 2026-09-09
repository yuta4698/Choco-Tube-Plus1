(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var VISIT_KEY = 'choco-visit-unlocked';
  var ON = 'on';
  var OFF = 'off';
  var started = false;

  function isEnabled() {
    try { return localStorage.getItem(STORAGE_KEY) !== OFF; }
    catch (e) { return true; }
  }

  function setEnabled(enabled) {
    try { localStorage.setItem(STORAGE_KEY, enabled ? ON : OFF); } catch (e) {}
  }

  function hasUnlockedVisit() {
    try { return sessionStorage.getItem(VISIT_KEY) === ON; }
    catch (e) { return false; }
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

  // The secret mode is intentionally kept inside the same Choco-Tube page.
  // No popup, about:blank iframe, or second site is created. This makes ON/OFF
  // reversible and keeps the whole session in one browsing context.
  function applyPageMode() {
    var on = isEnabled();
    document.documentElement.classList.toggle('choco-secret-mode', on);
    document.body.classList.toggle('choco-secret-mode', on);
    document.documentElement.setAttribute('data-secret-mode', on ? 'on' : 'off');
    document.title = on ? 'about:blank' : 'Choco-Tube';
  }

  function updateButton(btn) {
    var on = isEnabled();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('secret-mode-on', on);
    var label = btn.querySelector('[data-secret-label]');
    if (label) label.textContent = on ? 'シークレット ON' : 'シークレット OFF';
    btn.title = on ? 'シークレットモード：ON' : 'シークレットモード：OFF';
  }

  function reloadCurrentPage() {
    // Re-run the page with the new setting, but stay on the exact same URL/site.
    // Cache-busting is unnecessary and would create a new navigation target.
    location.reload();
  }

  function disableSecretMode(btn) {
    if (!window.confirm('シークレットモードをOFFにしますか？')) return;
    setEnabled(false);
    updateButton(btn);
    applyPageMode();
    reloadCurrentPage();
  }

  function enableSecretMode(btn) {
    setEnabled(true);
    updateButton(btn);
    applyPageMode();
    reloadCurrentPage();
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

  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    applyPageMode();
    var btn = document.getElementById('secretModeBtn');
    if (btn) updateButton(btn);
  });

  function start() {
    if (started) return;
    started = true;

    var auth = markAuthenticatedVisit();

    // A new tab/window has no unlocked session, so show the password gate.
    // Once authenticated, sessionStorage keeps the current tab unlocked.
    if (!auth && !hasUnlockedVisit()) {
      location.replace('/login');
      return;
    }

    applyPageMode();
  }

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
    start();
  });
  addButton();
  start();
})();
