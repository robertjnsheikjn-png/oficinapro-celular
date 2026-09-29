const CACHE='oficinapro-funilaria-v19';
const FILES=['./','./index.html','./app.js?v=funilaria19','./cloud.js?v=19','./style.css?v=funilaria12','./manifest.webmanifest?v=13','./icon.svg?v=13','./login-logo.svg?v=12'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('oficinapro-funilaria-')&&key!==CACHE).map(key=>caches.delete(key))))])));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Auth and account data must never enter the shared service-worker cache.
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const allowed=FILES.some(file=>new URL(file,self.registration.scope).pathname===url.pathname);
 if(!allowed)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request)));
});
