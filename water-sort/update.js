/*
 * update.js — in-place updates for the installed app, so you never reinstall.
 *
 * Registers the service worker and, when a new version has been downloaded,
 * shows a small "New version — Refresh" toast. It never reloads on its own
 * (which could interrupt a running timer); the page reloads only after you tap
 * Refresh, which tells the waiting worker to take over.
 */
(function () {
  if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;

  function toast(worker) {
    if (document.getElementById('update-toast')) return;
    var t = document.createElement('div');
    t.id = 'update-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);' +
      'transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:12px;' +
      'background:#1c1c1e;color:#fff;padding:10px 12px 10px 18px;border-radius:16px;' +
      'font:500 15px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'box-shadow:0 10px 36px rgba(0,0,0,.4);max-width:calc(100vw - 32px)';
    var span = document.createElement('span'); span.textContent = 'New version available';
    var btn = document.createElement('button'); btn.textContent = 'Refresh';
    btn.style.cssText = 'border:0;border-radius:11px;padding:9px 16px;font:inherit;font-weight:700;' +
      'background:#0a84ff;color:#fff;cursor:pointer';
    btn.onclick = function () {
      btn.disabled = true; btn.textContent = 'Updating…';
      if (worker) worker.postMessage('skipWaiting'); else location.reload();
    };
    t.appendChild(span); t.appendChild(btn);
    document.body.appendChild(t);
  }

  navigator.serviceWorker.register('sw.js').then(function (reg) {
    // A worker already waiting from a previous visit.
    if (reg.waiting && navigator.serviceWorker.controller) toast(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        // "installed" + an existing controller means this is an update, not a first install.
        if (nw.state === 'installed' && navigator.serviceWorker.controller) toast(nw);
      });
    });
  }).catch(function () {});

  // The new worker took control (only after the user tapped Refresh): reload once.
  var reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloaded) return; reloaded = true; location.reload();
  });
})();
