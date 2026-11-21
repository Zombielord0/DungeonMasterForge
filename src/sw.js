/* Dungeon Master's Forge service worker: lets the app install and open without a connection.
   Pages and scripts are fetched fresh when online (so updates show at once) and fall back to the saved copy offline.
   The code and the built-in rules data (/assets/*) have a fingerprint in each file name, so a saved copy is always right and is used without asking the server.
   Sign-in, the campaign API and other sites are never cached. */
const CACHE = "dmforge-v3";
const ASSETS = []; // filled in by tools/build.mjs
const CORE = ["/", "/player.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", ...ASSETS];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/")) return;
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); } return res; })));
    return;
  }
  // The app is one page, so app navigations share the "/" copy; the TV window (player.html) keeps its own copy.
  const key = req.mode !== "navigate" ? req : url.pathname === "/player.html" ? "/player.html" : "/";
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key).then(hit => hit || Response.error())));
});
