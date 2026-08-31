// 🏖️ SkyClan Chatroom PWA Service Worker v1 — 网络优先，离线兜底（外壳）
const CACHE = 'chatroom-pwa-v1';
const SHELL = [
  './',
  './admin.html',
  './admin.html?app=chatroom',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // API 跨域直连（tpg-hq.thawflow.com / tpg-hq.icepaw.workers.dev），不缓存
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() =>
      caches.match(e.request).then(m => m || caches.match('./admin.html?app=chatroom'))
    )
  );
});
