// גרסת המטמון: יש להעלות את המספר בכל פעם שמעדכנים את הדף או את הנתונים
const CACHE = 'herbs-v6';
const FILES = ['./', 'index.html', 'herbs-data.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/frank-hebrew.woff2', 'fonts/frank-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('herbs-v') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// מהמטמון מיד (עובד בלי אינטרנט), ובמקביל מעדכן ברקע כשיש רשת
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
