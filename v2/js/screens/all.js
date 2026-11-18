// כל הצמחים לפי סדר א-ב, עם קפיצה לאות. מוצג גם בתחתית מסך הבית.
import { store } from '../store.js';
import { $, icon, herbCard } from '../ui.js';
import { bindList } from './results.js';

export const nav = '';

// מיון לפי השם העברי (מדלגים על מילים לועזיות בתחילת השם); צמח בלי שם עברי נכנס תחת #
const key = h => (h.n.match(/[א-ת].*/) || [''])[0];
export function groups() {
  const sorted = [...store.herbs].sort((a, b) => (key(a) ? 0 : 1) - (key(b) ? 0 : 1) || key(a).localeCompare(key(b), 'he') || a.latin.localeCompare(b.latin));
  const g = new Map();
  for (const h of sorted) { const l = key(h)[0] || '#'; if (!g.has(l)) g.set(l, []); g.get(l).push(h); }
  return g;
}
const lid = l => 'l-' + (l === '#' ? 'x' : l);

export function abcList() {
  const g = groups();
  return `<div class="abc">${[...g.keys()].map(l => `<button type="button" data-l="${l}">${l}</button>`).join('')}</div>
    <div class="list abclist">${[...g].map(([l, hs]) => `<h4 class="letter" id="${lid(l)}">${l}</h4>${hs.map(h => herbCard(h)).join('')}`).join('')}</div>
    <button type="button" class="totop" aria-label="חזרה לראש הדף">${icon('up')}</button>`;
}
export function bindAbc(el) {
  bindList($('.abclist', el));
  const top = $('.totop', el);
  let jumped = false;
  // הכפתור מופיע אחרי גלילה קצת למטה או קפיצה לאות, ונעלם בראש הדף
  const upd = () => {
    if (!top.isConnected) return removeEventListener('scroll', upd);
    if (scrollY < 40) jumped = false;
    top.classList.toggle('on', jumped || scrollY > 400);
  };
  addEventListener('scroll', upd, { passive: true });
  top.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  $('.abc', el).onclick = e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    document.getElementById(lid(b.dataset.l)).scrollIntoView({ block: 'start' });
    jumped = scrollY >= 40; upd();
  };
}

export function render(el) {
  el.innerHTML = `<div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>כל הצמחים</h3></div>
    <h2 class="count">${store.herbs.length} צמחים לפי א-ב</h2>${abcList()}`;
  bindAbc(el);
}
