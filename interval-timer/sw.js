/*
 * Stale-while-revalidate service worker: serves instantly from cache, refreshes
 * in the background, and offline still works. A new version is applied only when
 * the user taps Refresh (update.js posts 'skipWaiting'), never mid-session.
 */
var CACHE = 'interval-timer-v6';
var FILES = ['./', './index.html', './bgtimer.js', './update.js', './manifest.json',
             './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
});
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res && res.ok && res.type === 'basic') cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return null; });
      return cached || network.then(function (r) { return r || fetch(e.request); });
    });
  }));
});
