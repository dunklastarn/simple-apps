/*
 * Stale-while-revalidate service worker for the le apps (same pattern as the
 * other apps). Flags are cached the first time each one is shown.
 * Bump CACHE to ship an update.
 */
var CACHE = 'le-apps-v2';
var FILES = ['./', './index.html', './globe.html', './outline.html', './words.html', './flaggle.html', './flagcolors.html', './flagmatch.html',
             './common.css', './common.js', './gate.js', './update.js', './vendor-d3geo.js',
             './data/countries.js', './data/words.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
             './icons/globe.svg', './icons/outline.svg', './icons/words.svg', './icons/flaggle.svg', './icons/flagcolors.svg', './icons/flagmatch.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
});
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE || k.indexOf('le-apps-') !== 0 ? null : caches.delete(k); }));
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
