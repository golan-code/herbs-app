// חיפוש מלא: אותו חיפוש וסינון בדיוק כמו בגרסה הנוכחית (כל השדות, חלק הצמח, סינון סיני)
import { find } from '../search.js';
import { E, $, icon } from '../ui.js';
import { setQuery } from '../router.js';
import { list, bindList, selFromStr, selToStr } from './results.js';
import { partsHtml, tcmHtml, onTcmClick, selLabel } from './filters.js';

export function render(el, r) {
  const sel = selFromStr(r.q.sel); let part = r.q.part || '';
  el.innerHTML = `<div class="bar"><h3>חיפוש</h3></div>
    <form class="sbar" role="search">${icon('search')}<input type="search" enterkeyhint="search" autocomplete="off" value="${E(r.q.q || '')}" placeholder="חיפוש צמח, מצב או רכיב…" aria-label="חיפוש"></form>
    ${partsHtml(part)}
    <details class="box" id="tf"><summary>☯ סינון לפי המבט הסיני <span id="n"></span></summary><div id="tags">${tcmHtml(sel)}</div></details>
    <h2 class="count" id="cnt"></h2><div class="list" id="list"></div>`;
  const input = $('input', el), box = $('#list', el);
  if (Object.values(sel).some(a => a.length)) $('#tf', el).open = true;
  const run = () => {
    const items = find({ q: input.value, mode: 'all', part, sel });
    $('#cnt', el).textContent = items.length + ' צמחים';
    $('#n', el).textContent = selLabel(sel);
    box.innerHTML = list(items);
    setQuery({ q: input.value, part, sel: selToStr(sel) });
  };
  input.oninput = run;
  $('form', el).onsubmit = e => { e.preventDefault(); input.blur(); };
  $('#parts', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; part = b.dataset.v; el.querySelectorAll('#parts button').forEach(x => x.classList.toggle('on', x === b)); run(); };
  $('#tags', el).onclick = e => { if (onTcmClick(e, sel, $('#tags', el))) run(); };
  run(); bindList(box);
  if (!r.q.q && !part) setTimeout(() => input.focus({ preventScroll: true }), 50);
}
