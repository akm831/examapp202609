const CACHE="examapp-shell-v2";
const SHELL=["/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("examapp-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  // Never cache authenticated pages, API data or Next.js navigation responses.
  if(event.request.method!=="GET"||url.origin!==self.location.origin||!SHELL.includes(url.pathname)||url.search)return;
  event.respondWith(fetch(event.request).catch(async()=>{
    const cached=await caches.match(event.request);
    return cached||Response.error();
  }));
});
