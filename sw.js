var cacheName = 'MusicPlayer-v2';
var urlsToCache = [
  '/music-player/',
  '/music-player/extension/jquery-3.6.0.min.js',
  '/music-player/extension/jsmediatags.min.js',
  '/music-player/extension/push.min.js',
  '/music-player/image/face_normal.png',
  '/music-player/image/mouth_close.png',
  '/music-player/image/mouth_open.png',
  '/music-player/image/mouth_open_light.png',
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

// Activating new version cache
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if(key !== cacheName) { return caches.delete(key); }
      }));
    }).then(() => {
      console.log(`${cacheName} now ready to handle fetches.`);
    })
  );
});
