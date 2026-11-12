/* Offline-Speicher für «Wörtli üben»: die App läuft auch ohne Internet.
   Die Versionsnummer setzt build-web.js bei jedem Bauen neu, dann holen sich alle Geräte das Update. */
const CACHE = "woertli-20261112-191134";
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
// Die Anmelde-Bibliothek (jsDelivr): zuerst aus dem Speicher, sonst holen und merken.
// Anfragen an Supabase (Anmeldung, Fortschritt) gehen immer direkt ins Internet.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // nur die bekannten App-Dateien speichern, sonst nichts
    const scope = new URL("./", self.registration.scope).pathname;
    const rel = "./" + url.pathname.slice(scope.length);
    const key = req.mode === "navigate" ? "./index.html" : (FILES.includes(rel) ? rel : null);
    e.respondWith(fetch(req).then(res => {
      if (res.ok && key) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => key ? caches.match(key) : Response.error()));
    return;
  }
  // Schriften von Google lädt der Browser selbst (eigener Zwischenspeicher); nur die Anmelde-Bibliothek wird hier gemerkt
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
