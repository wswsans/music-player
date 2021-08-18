self.importScripts('scriptV1.js');
var cacheName = 'MusicPlayer v1';
var appShellFiles = [
	'extension/jsmediatags.min.js',
	'extension/jquery-3.6.0.min.js',
	'image/face_normal.png',
	'image/mouse_close.png',
	'image/mouse_open.png',
	'image/mouse_open_light.png',
	'image/no_image.png',
	'googleff1a1e907a783b3b.html',
	'index.html',
	'scriptV1.js',
	'style.css'
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