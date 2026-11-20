import { herb, prefs } from '../store.js';
import { find, matchedUses, similar, emptySel } from '../search.js';
import { E, $, icon, herbCard, bubble, enableSwipe } from '../ui.js';
import { setQuery } from '../router.js';
import { tabsHtml, searchBar, setTabs } from './home.js';

export const nav = 'search';

// סינון סיני בכתובת: sel=t:מר|a:מניע דם
export const selFromStr = s => { const o = emptySel(); (s || '').split('|').filter(Boolean).forEach(x => { const [k, v] = [x[0], x.slice(2)]; o[k]?.push(v); }); return o; };
export const selToStr = o => Object.entries(o).flatMap(([k, vs]) => vs.map(v => k + ':' + v)).join('|');

export function list(items, opts = {}) {
  if (!items.length) return '<p class="empty">לא נמצאו צמחים. אפשר לנסות מילה אחרת או לשונית אחרת.</p>';
  const hint = !prefs.get('swiped', false);
  const tip = hint ? `<p class="hand">החליקו כרטיס ימינה כדי לראות תמונה <svg viewBox="0 0 34 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 9h28M24 3l6 6-6 6"/></svg></p>` : '';
  return tip + items.map(x => {
    const h = x.h || x, sc = x.h ? x.score : null;
    return herbCard(h, { uses: opts.q != null ? matchedUses(h, opts.q) : null, extra: sc != null ? `<em class="score">${sc}% דמיון</em>` : '' });
  }).join('');
}
export function bindList(box) {
  enableSwipe(box, id => { prefs.set('swiped', true); document.querySelectorAll('.hand').forEach(x => x.remove()); bubble(herb(id)); });
}

export function render(el, r) {
  const q = r.q.q || '', part = r.q.part || '', simId = r.q.similar;
  let mode = r.q.mode || (part ? 'all' : 'name');
  const sel = selFromStr(r.q.sel);

  if (simId) {
    const ref = herb(simId); const items = similar(ref);
    el.innerHTML = `<div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>צמחים דומים במבט הסיני</h3></div>
      <p class="lead">${items.length} צמחים דומים ל<b>${E(ref.n)}</b>, מהדומה ביותר. ההתאמה לפי טעם, טמפרטורה, לחות ופעולות.</p>
      <div class="list">${herbCard(ref, { extra: '<em class="score ref">הצמח שבחרת</em>' })}${list(items)}</div>`;
    return bindList($('.list', el));
  }

  el.innerHTML = `<div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3 id="ttl">תוצאות חיפוש</h3></div>
    ${part ? '' : `<div id="tabs">${tabsHtml(mode)}</div>`}
    <div id="sb">${searchBar(mode, q)}</div>
    <h2 class="count" id="cnt"></h2><div class="list" id="list"></div>`;
  const box = $('#list', el), input = () => $('input', el);
  const run = () => {
    const v = input().value;
    const items = find({ q: v, mode, part, sel });
    const t = v.trim();
    $('#ttl', el).textContent = t ? 'תוצאות חיפוש' : 'כל הצמחים';
    $('#cnt', el).textContent = part && !t ? `${items.length} צמחים · ${part}`
      : mode === 'uses' && t ? `${items.length} צמחים שמשמשים ל${t}` : t ? `${items.length} תוצאות ל"${t}"` : `${items.length} צמחים`;
    box.innerHTML = list(items, { q: mode === 'uses' ? v : null });
    setQuery({ mode, q: v, part, sel: selToStr(sel) });
  };
  const bind = () => {
    input().oninput = run;
    $('form', el).onsubmit = e => { e.preventDefault(); input().blur(); };
    const tb = $('#tabs', el); if (tb) tb.onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; prefs.set('tab', mode);
      setTabs(el, mode); run();
    };
  };
  bind(); run(); bindList(box);
}
