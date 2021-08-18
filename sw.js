self.importScripts('scriptV1.js');
var cacheName = 'MusicPlayer v1';
var appShellFiles = [
	'/music-player/extension/jsmediatags.min.js',
	'/music-player/extension/jquery-3.6.0.min.js',
	'/music-player/image/face_normal.png',
	'/music-player/image/mouse_close.png',
	'/music-player/image/mouse_open.png',
	'/music-player/image/mouse_open_light.png',
	'/music-player/image/no_image.png',
	'/music-player/googleff1a1e907a783b3b.html',
	'/music-player/index.html',
	'/music-player/scriptV1.js',
	'/music-player/style.css'
];

self.addEventListener('install', function(e) {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(contentToCache);
    })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) {
      console.log('[Service Worker] Fetching resource: '+e.request.url);
      return r || fetch(e.request).then(function(response) {
        return caches.open(cacheName).then(function(cache) {
          console.log('[Service Worker] Caching new resource: '+e.request.url);
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});