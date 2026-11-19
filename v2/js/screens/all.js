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
  return `<div class="abc"><i class="abcpill"></i>${[...g.keys()].map(l => `<button type="button" data-l="${l}">${l}</button>`).join('')}</div>
    <div class="list abclist">${[...g].map(([l, hs]) => `<h4 class="letter" id="${lid(l)}">${l}</h4>${hs.map(h => herbCard(h)).join('')}`).join('')}</div>
    <button type="button" class="totop" aria-label="חזרה לראש הדף">${icon('up')}</button>`;
}
export function bindAbc(el) {
  bindList($('.abclist', el));
  const top = $('.totop', el), abc = $('.abc', el), pill = $('.abcpill', abc);
  const btns = [...abc.querySelectorAll('button')], heads = [...el.querySelectorAll('.letter')];
  let jumped = false, cur = null, raf = 0, held = null, shown = false;
  // מסמנים אות: העיגול הירוק מחליק אליה (כמו האליפסה בסרגל התחתון), והשורה זזה לרוחב (לא הדף) כך שהאות באמצע
  const mark = b => {
    if (b === cur) return;
    cur?.classList.remove('on'); cur = b;
    if (!b) { pill.style.opacity = 0; shown = false; return abc.scrollTo({ left: 0, behavior: 'smooth' }); }  // בראש הדף: העיגול נעלם והשורה חוזרת להתחלה
    b.classList.add('on');
    if (!shown) pill.style.transition = 'opacity .2s';  // כשהעיגול מופיע: במקום, בלי החלקה
    // מודדים על המסך (עובד מימין לשמאל וגם באמצע החלקה): כמה להזיז את מרכז העיגול למרכז האות
    const p = pill.getBoundingClientRect(), r0 = b.getBoundingClientRect();
    pill.style.translate = `${(parseFloat(getComputedStyle(pill).translate) || 0) + r0.left + r0.width / 2 - (p.left + p.width / 2)}px 0`;
    if (!shown) { pill.offsetWidth; pill.style.transition = ''; shown = true; }
    pill.style.opacity = 1;
    const r = b.getBoundingClientRect(), a = abc.getBoundingClientRect();
    abc.scrollBy({ left: r.left + r.width / 2 - (a.left + a.width / 2), behavior: 'smooth' });
  };
  // האות הנוכחית: הכותרת האחרונה שעברה את תחתית השורה; בתחתית הדף — האחרונה
  const pick = () => {
    raf = 0;
    if (held && held.y === scrollY) return;  // אחרי לחיצה: נשארים על האות שנלחצה עד שגוללים
    held = null;
    let i = -1;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) i = heads.length - 1;
    else {
      const line = abc.getBoundingClientRect().bottom + 12;  // 12 = המרווח שמעל הכותרת אחרי קפיצה
      while (i + 1 < heads.length && heads[i + 1].getBoundingClientRect().top <= line) i++;
    }
    mark(btns[i] || null);
  };
  // הכפתור למעלה מופיע אחרי גלילה קצת למטה או קפיצה לאות, ונעלם בראש הדף
  const upd = () => {
    if (!top.isConnected) return removeEventListener('scroll', upd);
    if (scrollY < 40) jumped = false;
    top.classList.toggle('on', jumped || scrollY > 400);
    raf ||= requestAnimationFrame(pick);
  };
  addEventListener('scroll', upd, { passive: true });
  top.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  abc.onclick = e => {
    const b = e.target.closest('[data-l]'); if (!b) return;
    document.getElementById(lid(b.dataset.l)).scrollIntoView({ block: 'start' });
    jumped = scrollY >= 40; upd();
    held = { y: scrollY }; mark(b);
  };
  pick();
}

export function render(el) {
  el.innerHTML = `<div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>כל הצמחים</h3></div>
    <h2 class="count">${store.herbs.length} צמחים לפי א-ב</h2>${abcList()}`;
  bindAbc(el);
}
