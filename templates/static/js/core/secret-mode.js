(function () {
  'use strict';

  var STORAGE_KEY = 'choco-secret-mode';
  var ON = 'on';

  function isEnabled() {
    return localStorage.getItem(STORAGE_KEY) === ON;
  }

  function getVideoIdFromUrl(url) {
    try {
      var u = new URL(url, window.location.origin);
      var m = u.pathname.match(/^\/(?:watch|video)\/([^/?#]+)/);
      if (m) return m[1];
      return u.searchParams.get('v') || u.searchParams.get('video') || u.searchParams.get('id');
    } catch (e) {
      return null;
    }
  }

  function openSecretPlayer(videoId, originalUrl) {
    if (!videoId) return false;

    var win = window.open('about:blank', '_blank');
    if (!win) return false;

    var autoplay = '1';
    var embed = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=' + autoplay + '&rel=0';

    var safeUrl = originalUrl || '';
    var html = '<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choco-tube-plus - シークレット再生</title><style>' +
      'html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}' +
      'iframe{border:0;width:100%;height:100%;display:block}' +
      '.badge{position:fixed;z-index:10;top:12px;left:12px;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.65);color:#fff;font:12px system-ui,sans-serif;opacity:.25;transition:opacity .2s}.badge:hover{opacity:1}' +
      '</style></head><body>' +
      '<iframe src="' + embed.replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '<div class="badge">Choco-tube-plus · シークレットモード</div>' +
      '</body></html>';

    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      try { win.history.replaceState({}, '', 'about:blank'); } catch (e) {}
      return true;
    } catch (e) {
      try { win.location.href = safeUrl; } catch (_) {}
      return true;
    }
  }

  function shouldIntercept(anchor, event) {
    if (!isEnabled() || !anchor || event.defaultPrevented) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    var href = anchor.getAttribute('href');
    if (!href) return false;
    return !!getVideoIdFromUrl(href);
  }

  function updateButton(btn) {
    var enabled = isEnabled();
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.classList.toggle('secret-mode-on', enabled);
    var label = btn.querySelector('[data-secret-label]');
    if (label) label.textContent = enabled ? 'シークレット ON' : 'シークレット OFF';
    btn.title = enabled ? 'シークレットモード：ON（動画はabout:blankで開きます）' : 'シークレットモード：OFF';
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.secretBound === '1') return;
    btn.dataset.secretBound = '1';
    updateButton(btn);
    btn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, isEnabled() ? 'off' : ON);
      updateButton(btn);
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

  document.addEventListener('click', function (event) {
    if (!isEnabled()) return;
    var anchor = event.target.closest ? event.target.closest('a[href]') : null;
    if (!shouldIntercept(anchor, event)) return;

    var href = anchor.href;
    var videoId = getVideoIdFromUrl(href);
    if (!videoId) return;

    if (openSecretPlayer(videoId, href)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    addButton();
  });

  addButton();
})();
