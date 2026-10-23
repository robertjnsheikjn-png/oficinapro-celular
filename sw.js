const CACHE = 'oficinapro-gestao-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['./', './index.html', './style.css?v=1', './app.js?v=1', './shared.js?v=1', './manifest.webmanifest']))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('oficinapro-gestao-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => { if (event.request.method === 'GET' && new URL(event.request.url).origin === location.origin) event.respondWith(fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())); return response; }).catch(() => caches.match(event.request))); });

