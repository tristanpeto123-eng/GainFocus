const CACHE_NAME='gain-focus-photo-thumbs-v2-local-5';
const SHELL=['./','./index.html','./manifest.webmanifest','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./ux-credit-free-patch.js','./exercise-photo-thumbnails-v2.js','./exercise-photo-index-v2.json','./exercise-photo-readiness.js?v=3','./nutrition-portions.js','./nutrition-ocr-enhanced.js','./nutrition-barcode.js','./workfuel-portions.js','./exercise-thumbnails/bench.webp','./exercise-thumbnails/incline.webp','./exercise-thumbnails/shoulder.webp','./exercise-thumbnails/lateral.webp','./exercise-thumbnails/pulldown.webp','./exercise-thumbnails/row.webp','./exercise-thumbnails/triceps.webp','./exercise-thumbnails/squat.webp','./exercise-thumbnails/hinge.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
    return;
  }
  const url=new URL(e.request.url);
  // Force a genuine same-origin network request for the 3-second health probe:
  // cached PWA shell responses must never masquerade as online connectivity.
  if(url.origin===self.location.origin && url.searchParams.has('gf_probe')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }
  if(url.origin===self.location.origin && url.pathname.includes('/exercise-photos/') && e.request.destination==='image'){
    // Cache only photographs actually requested: no 49 MB first-install download.
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put(e.request,copy)).catch(()=>{}));
      }
      return response;
    })));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});
