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
import * as badphotos from './screens/badphotos.js';

const ROUTES = [
  ['', home],
  ['results', results],
  ['herb', herb],
  ['fav', favorites],
  ['tcm', tcm],
  ['search', search],
  ['lesson', lesson],
  ['all', all],
  ['badphotos', badphotos],
];
const NAV = [
  ['', 'בית', 'home'],
  ['fav', 'מועדפים', 'heart'],
  ['tcm', 'מבט סיני', 'yin'],
  ['search', 'חיפוש', 'search'],
];

const view = $('#view'), nav = $('#nav');
nav.innerHTML = `<div class="navin"><i class="pill"></i>${NAV.map(([p, t, i]) => `<a href="#/${p}" data-p="${p}" draggable="false">${icon(i)}<span>${t}</span></a>`).join('')}</div>`;
const pill = $('.pill', nav), links = [...nav.querySelectorAll('a')];
// מזיזים את האליפסה אל כפתור (או למיקום חופשי בזמן גרירה)
const placePill = (x, w) => { pill.style.width = w + 'px'; pill.style.transform = `translateX(${x}px)`; };
const pillTo = a => { if (!a) { pill.style.opacity = 0; return; } pill.style.opacity = 1; placePill(a.offsetLeft, a.offsetWidth); };
addEventListener('resize', () => pillTo(nav.querySelector('a.on')));
// גרירה: האליפסה עוקבת אחרי האצבע, ובשחרור עוברים לכפתור הקרוב
{
  let drag = null;
  const nearest = x => links.reduce((b, a) => Math.abs(a.offsetLeft + a.offsetWidth / 2 - x) < Math.abs(b.offsetLeft + b.offsetWidth / 2 - x) ? a : b);
  const localX = e => e.clientX - $('.navin', nav).getBoundingClientRect().left;
  nav.addEventListener('pointerdown', e => { drag = { x0: e.clientX, moved: false }; });
  nav.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 6) return;
    drag.moved = true; nav.classList.add('drag');
    const w = links[0].offsetWidth, x = Math.max(0, Math.min(localX(e) - w / 2, $('.navin', nav).offsetWidth - w));
    placePill(x, w); pill.style.opacity = 1;
    const n = nearest(localX(e)); links.forEach(a => a.classList.toggle('on', a === n));
  });
  const end = e => {
    if (!drag) return; const d = drag; drag = null; nav.classList.remove('drag');
    if (!d.moved) return;
    const n = nearest(localX(e)); pillTo(n);
    nav.dataset.justDragged = 1; setTimeout(() => delete nav.dataset.justDragged, 60);
    if (n.dataset.p !== currentNav || parse().name !== n.dataset.p) location.hash = '#/' + n.dataset.p;
  };
  nav.addEventListener('pointerup', end); nav.addEventListener('pointercancel', () => { drag = null; nav.classList.remove('drag'); pillTo(nav.querySelector('a.on')); });
  nav.addEventListener('click', e => { if (nav.dataset.justDragged) e.preventDefault(); });
}

let currentNav = '';
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
  const navKey = mod.nav ?? r.name; currentNav = navKey;
  links.forEach(a => a.classList.toggle('on', a.dataset.p === navKey));
  requestAnimationFrame(() => pillTo(nav.querySelector('a.on')));
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
