// רכיבי ממשק משותפים: אייקונים, חלונית תחתונה, בועת תמונה, כרטיס צמח.
import { favs, photos } from './store.js';

export const E = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);

const P = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  yin: '<circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9"/><circle cx="12" cy="7.5" r="1" fill="currentColor"/><circle cx="12" cy="16.5" r="1"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  go: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l8-8"/>',
  root: '<path d="M12 3v9"/><path d="M12 12c-1 3-3 5-6 8M12 12c1 3 3 5 6 8M12 12v9"/>',
  flower: '<circle cx="12" cy="9" r="2"/><path d="M12 5V3M12 13v8M8 9H6M18 9h-2M9.2 6.2 8 5M14.8 6.2 16 5M9.2 11.8 8 13M14.8 11.8 16 13"/>',
  seed: '<ellipse cx="12" cy="13" rx="5" ry="7"/><path d="M12 6c0 4 0 9 0 14"/>',
  bark: '<path d="M8 3v18M16 3v18M8 8c2 1 2 3 0 4M16 12c-2 1-2 3 0 4"/>',
  tuber: '<ellipse cx="12" cy="14" rx="6" ry="5"/><path d="M12 9V4M12 6l-3-2M12 6l3-2"/>',
  whole: '<path d="M12 21V9"/><path d="M12 13c-4 0-6-2-6-5 3 0 6 2 6 5zM12 11c4 0 6-2 6-5-3 0-6 2-6 5z"/><path d="M8 21h8"/>',
  fungus: '<path d="M4 12a8 6 0 0 1 16 0z"/><path d="M10 12v7h4v-7"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 10h14l-5-10V3"/>',
  warn: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17v.5"/>',
  book: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
};
export const icon = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const PART_ICON = { 'שורש': 'root', 'פקעת': 'tuber', 'עלים': 'leaf', 'פרחים': 'flower', 'פרי וזרעים': 'seed', 'קליפה וגזע': 'bark', 'הצמח כולו / נוף': 'whole', 'פטרייה / שרף / אחר': 'fungus' };
export const herbIcon = h => PART_ICON[h.p.split(', ')[0]] || 'leaf';

// תמונה ממוזערת: תמונה אמיתית אם קיימת, אחרת שומר מקום עם אייקון החלק בשימוש
export function thumb(h, cls = 'th') {
  const ph = photos(h)[0];
  return `<span class="${cls}">${icon(herbIcon(h))}${ph ? `<img src="${E(ph.src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>`;
}

export function herbCard(h, { uses, extra = '' } = {}) {
  return `<div class="rw" data-id="${h.id}"><div class="under">${icon('camera')}<span>תמונה</span></div>
  <a class="res" href="#/herb/${h.id}" draggable="false"><div><b>${E(h.n)}${extra}</b><small dir="ltr">${E(h.latin)}</small>
  <p>${E((uses || h.main.slice(0, 3)).join(', '))}</p></div><button type="button" class="thb" aria-label="תמונה של ${E(h.n)}">${thumb(h)}</button></a></div>`;
}

// ---- חלונית תחתונה ----
export function sheet(title, html) {
  closeLayers();
  const el = document.createElement('div');
  el.className = 'layer';
  el.innerHTML = `<div class="dim"></div><section class="sheet" role="dialog" aria-label="${E(title)}"><div class="grab"></div>
    <header><h3>${E(title)}</h3><button type="button" class="x" aria-label="סגירה">${icon('close')}</button></header><div class="body">${html}</div></section>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  el.addEventListener('click', e => { if (e.target.closest('.dim,.x')) closeLayers(); });
  return el;
}

// ---- בועת תמונה (החלקה ימינה על כרטיס או לחיצה על התמונה הקטנה) ----
export function bubble(h) {
  closeLayers();
  const ph = photos(h);
  const slides = ph.length
    ? ph.map(p => `<figure><span class="nf">${icon('camera')}<span>התמונה לא נטענה</span></span><img src="${E(p.src)}" alt="${E(h.n)}" referrerpolicy="no-referrer">${p.credit ? `<figcaption>${p.page ? `<a href="${E(p.page)}" target="_blank" rel="noopener">מקור: ${E(p.credit)}</a>` : E(p.credit)}</figcaption>` : ''}</figure>`).join('')
    : `<figure class="ph">${icon('camera')}<span>כאן תופיע תמונה אמיתית של הצמח</span></figure>`;
  const el = document.createElement('div');
  el.className = 'layer';
  el.innerHTML = `<div class="dim"></div><section class="bub" role="dialog" aria-label="${E(h.n)}">
    <button type="button" class="x" aria-label="סגירה">${icon('close')}</button>
    <div class="slides">${slides}</div>
    ${ph.length > 1 ? `<div class="dots">${ph.map((_, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div>` : ''}
    <b>${E(h.n)}</b><small dir="ltr">${E(h.latin)}</small>
    <div class="bact"><button type="button" class="fav ${favs.has(h.id) ? 'on' : ''}" aria-label="מועדפים">${icon('heart')}</button>
    <a class="btn" href="#/herb/${h.id}">לעמוד הצמח</a></div></section>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const sl = $('.slides', el), dots = el.querySelectorAll('.dots i');
  sl.addEventListener('scroll', () => { const k = Math.round(Math.abs(sl.scrollLeft) / sl.clientWidth); dots.forEach((d, j) => d.classList.toggle('on', j === k)); });
  el.addEventListener('click', e => {
    if (e.target.closest('.dim,.x,.btn')) return closeLayers();
    const f = e.target.closest('.fav'); if (f) { f.classList.toggle('on', favs.toggle(h.id)); document.dispatchEvent(new Event('favs')); }
  });
}

// תמונה שלא נטענה (קישור שבור או חסום): מסתירים אותה ומשאירים את שומר המקום
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('broken'); }, true);

export function closeLayers() { document.querySelectorAll('.layer').forEach(l => l.remove()); }
addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); });

// ---- החלקה ימינה על כרטיס פותחת את הבועה ----
export function enableSwipe(root, onOpen) {
  let st = null;
  root.addEventListener('pointerdown', e => {
    const rw = e.target.closest('.rw'); if (!rw || e.button > 0) return;
    st = { rw, card: $('.res', rw), x: e.clientX, y: e.clientY, dx: 0, lock: null };
  });
  root.addEventListener('pointermove', e => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (st.lock == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) st.lock = Math.abs(dx) > Math.abs(dy) && dx > 0 ? 'x' : 'y';
    if (st.lock !== 'x') return;
    st.dx = Math.max(0, Math.min(dx, 140));
    st.card.style.transform = `translateX(${st.dx}px)`; st.rw.classList.add('moving');
  });
  const end = () => {
    if (!st) return; const s = st; st = null;
    s.card.style.transition = 'transform .2s'; s.card.style.transform = '';
    setTimeout(() => { s.card.style.transition = ''; s.rw.classList.remove('moving'); }, 220);
    if (s.lock === 'x') { s.rw.dataset.swiped = '1'; setTimeout(() => delete s.rw.dataset.swiped, 50); if (s.dx > 70) onOpen(s.rw.dataset.id); }
  };
  root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
  // לא לפתוח את עמוד הצמח אחרי החלקה; לחיצה על התמונה הקטנה פותחת בועה
  root.addEventListener('click', e => {
    const rw = e.target.closest('.rw'); if (!rw) return;
    if (rw.dataset.swiped) { e.preventDefault(); return; }
    if (e.target.closest('.thb')) { e.preventDefault(); onOpen(rw.dataset.id); }
  });
}
