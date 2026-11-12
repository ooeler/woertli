/* Offline-Speicher für «Wörtli üben»: die App läuft auch ohne Internet.
   Bei einer neuen Version die Nummer erhöhen, dann holt sich die App alles frisch. */
const CACHE = "woertli-v3";
const FILES = ["./", "./index.html", "./kuh.jpg", "./manifest.webmanifest",
               "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./auth.js", "./auth.css", "./config.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Eigene Dateien (Seite, config.js, auth.js …): zuerst aus dem Internet (neueste Version), sonst aus dem Speicher.
// Schriften und die Anmelde-Bibliothek: zuerst aus dem Speicher, sonst holen und merken.
// Anfragen an Supabase (Anmeldung, Fortschritt) gehen immer direkt ins Internet.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)); }
      return res;
    }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req, { ignoreSearch: true })));
    return;
  }
  if (url.hostname.includes("fonts.g") || url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
