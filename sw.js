/* Offline app shell only; Wiki prices always require network. */
const CACHE='osrs-pump-hc-v050-flip-shell';
const ASSETS=['./','./index.html','./styles.css','./logic.js','./app.js','./market-intel.js',
'./history-chart.js','./v03.js','./dashboard.js','./flip-scanner.js','./v03.css','./icons/pump.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const clone=r.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return r}).catch(()=>caches.match(e.request)))});
