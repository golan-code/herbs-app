// נקודת הכניסה: טעינת נתונים, ניתוב בין מסכים, סרגל תחתון.
// להוספת מסך חדש (פתולוגיות, פורמולות, מקרה חי): יוצרים קובץ ב-screens/ ומוסיפים שורה ל-ROUTES,
// ואם צריך כפתור בסרגל התחתון, שורה ל-NAV.
import { load } from './store.js';
import { loadLeadPhotos } from './commons.js';
import { icon, closeLayers, $ } from './ui.js';
import { parse, go } from './router.js';
import * as home from './screens/home.js';
import * as results from './screens/results.js';
import * as herb from './screens/herb.js';
import * as favorites from './screens/favorites.js';
import * as tcm from './screens/tcm.js';
import * as search from './screens/search.js';
import * as lesson from './screens/lesson.js';
import * as all from './screens/all.js';

const ROUTES = [
  ['', home],
  ['results', results],
  ['herb', herb],
  ['fav', favorites],
  ['tcm', tcm],
  ['search', search],
  ['lesson', lesson],
  ['all', all],
];
const NAV = [
  ['', 'בית', 'home'],
  ['fav', 'מועדפים', 'heart'],
  ['tcm', 'מבט סיני', 'yin'],
  ['search', 'חיפוש', 'search'],
];

const view = $('#view'), nav = $('#nav');
nav.innerHTML = NAV.map(([p, t, i]) => `<a href="#/${p}" data-p="${p}">${icon(i)}<span>${t}</span></a>`).join('');

const scrollPos = new Map();
let current = '';
function render() {
  closeLayers();
  scrollPos.set(current, scrollY);
  const r = parse();
  const mod = (ROUTES.find(([n]) => n === r.name) || ROUTES[0])[1];
  view.innerHTML = '';
  view.className = 'scr scr-' + (r.name || 'home');
  mod.render(view, r);
  const navKey = mod.nav ?? r.name;
  nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.p === navKey));
  current = location.hash;
  scrollTo(0, scrollPos.get(current) || 0);
}

load().then(() => { addEventListener('hashchange', render); render(); loadLeadPhotos(() => { if (document.querySelector('.layer') || document.activeElement?.matches('input')) return; const y = scrollY; render(); scrollTo(0, y); }); })
  .catch(() => { view.innerHTML = '<p class="empty">לא ניתן לטעון את הנתונים. יש לפתוח את האפליקציה דרך האתר (https) ולא ישירות מהקובץ.</p>'; });

// כפתור חזרה בכותרות
document.addEventListener('click', e => {
  if (!e.target.closest('.backb')) return;
  e.preventDefault();
  history.length > 1 ? history.back() : go('');
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // כשעולה גרסה חדשה, טוענים אותה מיד במקום להציג את הישנה מהמטמון
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r && r.update()).catch(() => {}));
}
