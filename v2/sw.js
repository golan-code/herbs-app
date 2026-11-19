// גרסת המטמון של v2: להעלות את המספר בכל שינוי בדף, בקוד או בנתונים
const CACHE = 'herbs2-v28';
const FILES = ['./', 'index.html', 'app.css', 'manifest.webmanifest',
  'js/app.js', 'js/router.js', 'js/store.js', 'js/search.js', 'js/ui.js',
  'js/screens/home.js', 'js/screens/results.js', 'js/screens/herb.js', 'js/screens/favorites.js',
  'js/screens/tcm.js', 'js/screens/search.js', 'js/screens/filters.js', 'js/screens/lesson.js', 'js/screens/all.js', 'js/commons.js', 'js/screens/badphotos.js',
  'js/firebase.js', 'js/access.js', 'admin.html', 'js/admin.js',
  'data/images.json', 'data/lessons.json',
  'fonts/heebo-hebrew.woff2', 'fonts/heebo-latin.woff2',
  '../fonts/frank-hebrew.woff2', '../fonts/frank-latin.woff2',
  '../icons/icon-192.png', '../icons/icon-512.png', '../icons/icon-maskable-512.png', '../icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

// מוחק רק מטמונים ישנים של v2, לא את של הגרסה הראשית
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('herbs2-v') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// מהמטמון מיד (עובד בלי אינטרנט), ובמקביל מעדכן ברקע כשיש רשת.
// תמונות מאתרים חיצוניים נשמרות במטמון נפרד ברגע שנצפו פעם אחת.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    // ספריית Firebase: נשמרת במטמון כדי שהאפליקציה תיפתח גם בלי אינטרנט (הגרסה קבועה בכתובת)
    if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
      e.respondWith(caches.open('herbs2-lib').then(async c => (await c.match(e.request)) ||
        fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
      return;
    }
    if (e.request.destination !== 'image') return; // בקשות API (Wikipedia/Commons) עוברות ישר לרשת
    e.respondWith(caches.open('herbs2-img').then(async c => (await c.match(e.request)) ||
      fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; })));
    return;
  }
  // קודם מהרשת (כך שעדכונים מופיעים מיד), ואם אין רשת – מהמטמון
  e.respondWith(caches.open(CACHE).then(c =>
    fetch(e.request, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
      .catch(() => c.match(e.request, {ignoreSearch: true}))));
});
