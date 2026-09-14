const CACHE_NAME='gain-focus-v4-0-45-final-shell';
const SHELL=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).catch(()=>null));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response;
  }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
self.addEventListener('push',event=>{
  let data={title:'Gain Focus',body:'You have a new update.',tag:'gain-focus',url:'./index.html'};
  try{if(event.data)data={...data,...event.data.json()}}catch{try{data.body=event.data.text()}catch{}}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,tag:data.tag||'gain-focus',data:{url:data.url||'./index.html'},badge:data.badge,icon:data.icon}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=event.notification.data?.url||'./index.html';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate?.(url);return client.focus()}}
    return clients.openWindow?clients.openWindow(url):null;
  }));
});
