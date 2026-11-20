import { herb, favs, recent, photos } from '../store.js';
import { E, $, icon, sheet, bubble, herbIcon } from '../ui.js';

export const nav = '';

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
  el.innerHTML = `
  <div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>${E(h.n)}</h3></div>
  <button type="button" class="hero ${ph ? 'has' : ''}" aria-label="תמונות של ${E(h.n)}">
    ${icon(herbIcon(h), 'big')}<span>${icon('camera')} תמונה אמיתית תתווסף בהמשך</span>${ph ? `<img src="${E(ph.src)}" alt="${E(h.n)}" referrerpolicy="no-referrer">${photos(h).length > 1 ? `<em class="cnt">${icon('camera')} ${photos(h).length}</em>` : ''}` : ''}
  </button>
  <section class="panel">
    <div class="ttl"><div><b dir="ltr">${E(h.latin)}</b><small>${E([h.en, h.part.replace('חלקים בשימוש: ', '')].filter(Boolean).join(' · '))}</small></div>
    <button type="button" class="fav ${favs.has(h.id) ? 'on' : ''}" aria-label="הוספה למועדפים">${icon('heart')}</button></div>
    <p>${E(summary(h))}</p>
    ${pills(h)}
    <div class="acts">${Object.entries(PANELS).map(([k, [t, i]]) => `<button type="button" data-k="${k}">${icon(i)}<span>${t}</span></button>`).join('')}</div>
    <a class="cta" href="#/results?similar=${h.id}">צמחים דומים במבט הסיני</a>
    <a class="lesson-l" href="#/lesson/${h.id}">${icon('book')} שיעור על ${E(h.n)}</a>
  </section>`;
  el.onclick = e => {
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k) { const [t, , f] = PANELS[k]; sheet(t + ' · ' + h.n, f(h)); return; }
    if (e.target.closest('.hero')) return bubble(h);
    const f = e.target.closest('.fav'); if (f) f.classList.toggle('on', favs.toggle(h.id));
  };
}
