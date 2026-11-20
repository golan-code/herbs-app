import { herb, favs, recent, photos } from '../store.js';
import { E, $, icon, bubble, herbIcon, pastel, segHtml, setSeg, toggleFav } from '../ui.js';

// הסרגל התחתון נשאר על הלשונית שממנה הגיעו (בית / חיפוש / מועדפים...)
export const nav = 'inherit';

const chips = (t, a, cls = '') => a.length ? `<h4>${t}</h4><div class="chips ${cls}">${a.map(x => `<span>${E(x)}</span>`).join('')}</div>` : '';
export const tcmTags = h => `<div class="tg">${[...h.c.t, ...h.c.m, ...h.c.l].map(v => `<span>${E(v)}</span>`).join('')}${h.c.a.map(v => `<span class="a">${E(v)}</span>`).join('')}</div>`;
export const tcmBlocks = h => h.tcm.map(b => b.q != null ? `<p class="q"><b>${E(b.q)}</b> ${E(b.v)}</p>`
  : `<p class="act">${E(b.a)}</p><ul>${b.li.map(x => `<li>${E(x)}</li>`).join('')}</ul>`).join('');
export const pills = h => `<div class="pls"><span class="${h.preg[0]}">${E(h.preg[1])}</span><span class="${h.nurse[0]}">${E(h.nurse[1])}</span></div>`;

export const PANELS = {
  uses: ['שימושים', 'leaf', h => chips('שימושים מקובלים עיקריים', h.main, 'main') + chips('שימושים מקובלים משניים', h.sec) + chips('השפעה ידועה בספרות המקצועית', h.eff)],
  safe: ['בטיחות', 'warn', h => `<div class="safe"><p>${E(h.safe)}</p></div>${pills(h)}`],
  tcm: ['מבט סיני', 'yin', h => tcmTags(h) + tcmBlocks(h) + `<a class="cta" href="#/results?similar=${h.id}">צמחים דומים במבט הסיני</a>`],
  comp: ['רכיבים', 'flask', h => `<ul class="comp">${h.comp.map(([s, x]) => `<li class="${s ? 'sub' : ''}">${E(x)}</li>`).join('')}</ul>`],
};

// תקציר: הפעולה הראשונה במבט הסיני, ואם אין, ההשפעות העיקריות
export const summary = h => { const a = h.tcm.find(b => b.a); return (a ? a.a : h.eff.slice(0, 6).join(', ')).replace(/[.\s]+$/, '') + '.'; };

export function render(el, r) {
  const h = herb(r.args[0]);
  if (!h) { el.innerHTML = '<p class="empty">הצמח לא נמצא. <a href="#/">לדף הבית</a></p>'; return; }
  recent.add(h.id);
  const ph = photos(h)[0];
  // לשוניות בתוך העמוד (במקום חלונית תחתונה). מתחילים מ"שימושים"
  let tab = 'uses';
  el.innerHTML = `
  <div class="hwrap">
    <button type="button" class="hero ${ph ? 'has' : ''}" style="--tc:${pastel(h.id)}" aria-label="תמונות של ${E(h.n)}">
      ${icon(herbIcon(h), 'big')}<span>${icon('camera')} תמונה אמיתית תתווסף בהמשך</span>${ph ? `<img src="${E(ph.src)}" alt="${E(h.n)}" referrerpolicy="no-referrer">${photos(h).length > 1 ? `<em class="cnt">${icon('camera')} ${photos(h).length}</em>` : ''}` : ''}
    </button>
    <a href="#" class="backb" aria-label="חזרה">${icon('back')}</a>
    <button type="button" class="fav ${favs.has(h.id) ? 'on' : ''}" aria-label="${favs.has(h.id) ? 'הסרה מהמועדפים' : 'הוספה למועדפים'}">${icon('heart')}</button>
  </div>
  <section class="panel">
    <div class="ttl"><h1>${E(h.n)}</h1><small class="lat" dir="ltr">${E(h.latin)}</small><small>${E([h.en, h.part.replace('חלקים בשימוש: ', '')].filter(Boolean).join(' · '))}</small></div>
    <p>${E(summary(h))}</p>
    ${pills(h)}
    ${segHtml(Object.entries(PANELS).map(([k, [t, i]]) => [k, t, i]), tab, 'htabs')}
    <div class="tabbody" role="tabpanel">${PANELS[tab][2](h)}</div>
    <a class="cta" href="#/results?similar=${h.id}">צמחים דומים במבט הסיני</a>
    <a class="lesson-l" href="#/lesson/${h.id}">${icon('book')} שיעור על ${E(h.n)}</a>
  </section>`;
  el.onclick = e => {
    const k = e.target.closest('[data-m]')?.dataset.m;
    if (k && PANELS[k]) {
      if (k === tab) return;
      tab = k;
      setSeg($('.htabs', el), k); $('.tabbody', el).innerHTML = PANELS[k][2](h); return;
    }
    const f = e.target.closest('.fav'); if (f) return toggleFav(f, h);
    if (e.target.closest('.hero')) return bubble(h);
  };
}
