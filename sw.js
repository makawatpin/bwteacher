// Minimal service worker — required by Android/Chrome for standalone PWA install.
// สำคัญ: ทุกครั้งที่แก้ sw.js ต้องเปลี่ยนเลข CACHE ให้ต่างจากเดิม เพื่อบังคับล้างแคชเก่า
const CACHE = 'bwteacher-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app-icon-192-v2.png',
  './app-icon-512.png',
  './apple-touch-icon-v2.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for page navigations (HTML) so updates always propagate;
// cache-first for other static assets for speed/offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // ข้าม API ภายนอก (Supabase ฯลฯ) เสมอ — ห้ามแคชข้อมูล ต้องดึงสดทุกครั้ง ป้องกันข้อมูลค้าง
  const isSameOrigin = new URL(req.url).origin === self.location.origin;
  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
