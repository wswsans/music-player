var CACHE_NAME = 'MusicPlayer-v1';
var urlsToCache = [
  '/music-player/',
  '/music-player/extension/jsmediatags.min.js',
  '/music-player/extension/jquery-3.6.0.min.js',
  '/music-player/image/face_normal.png',
  '/music-player/image/mouse_close.png',
  '/music-player/image/mouse_open.png',
  '/music-player/image/mouse_open_light.png',
  '/music-player/image/no_image.png',
  '/music-player/index.html',
  '/music-player/scriptV1.js',
  '/music-player/style.css'
];

// Installing Service Worker
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(urlsToCache);
  })());
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const r = await caches.match(e.request);
    console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});