// הגרסה הראשונה הוסרה. ה-service worker הזה מחליף את הישן בטלפונים שהתקינו אותה:
// מוחק את המטמון הישן (כולל הנתונים), מסיר את עצמו, ומעביר לגרסה הנוכחית ב-v2/.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('herbs-v')).map(k => caches.delete(k)));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach(w => { if (!new URL(w.url).pathname.includes('/v2/')) w.navigate(new URL('v2/', self.registration.scope).href); });
  })());
});
