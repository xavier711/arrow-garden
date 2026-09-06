// Build replaces the version and resource list. Keep this worker at the app root.
const VERSION='__BUILD_VERSION__';
const FILES=[/* __PRECACHE__ */].flat();
const PREFIX=`arrow-garden:${self.registration.scope}@`;
const CACHE=PREFIX+VERSION;
const URLS=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([...URLS].map(url=>new Request(url,{cache:'reload'})));
    // No skipWaiting: a new release must not replace a game in progress.
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);url.search='';url.hash='';
  if(!URLS.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(url.href);
    // Serve one complete release, including its HTML, so scripts cannot mix versions.
    return cached||fetch(event.request);
  })());
});
