// Prosty service worker: aplikacja otwiera się z ekranu głównego także przy słabym zasięgu.
// Dane (wizyty) zawsze idą z sieci – w cache trzymamy tylko pliki aplikacji.
const CACHE = "bloomly-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const kopia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./"))),
  );
});
