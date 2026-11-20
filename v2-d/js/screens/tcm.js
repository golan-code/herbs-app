import { find } from '../search.js';
import { E, $, icon } from '../ui.js';
import { setQuery } from '../router.js';
import { list, bindList, selFromStr, selToStr } from './results.js';
import { tcmHtml, onTcmClick, selLabel } from './filters.js';

export function render(el, r) {
  const sel = selFromStr(r.q.sel);
  el.innerHTML = `<div class="bar"><h3>מבט סיני</h3></div>
    <form class="sbar" role="search">${icon('search')}<input type="search" enterkeyhint="search" autocomplete="off" value="${E(r.q.q || '')}" placeholder="פעולה או דפוס, למשל תקיעות צ'י…" aria-label="חיפוש במבט הסיני"></form>
    <details class="box" id="tf" open><summary>☯ סינון לפי איכויות ופעולות <span id="n"></span></summary><div id="tags">${tcmHtml(sel)}</div></details>
    <h2 class="count" id="cnt"></h2><div class="list" id="list"></div>`;
  const input = $('input', el), box = $('#list', el);
  const run = () => {
    const items = find({ q: input.value, mode: 'tcm', sel });
    $('#cnt', el).textContent = items.length + ' צמחים';
    $('#n', el).textContent = selLabel(sel);
    box.innerHTML = list(items);
    setQuery({ q: input.value, sel: selToStr(sel) });
  };
  input.oninput = run;
  $('form', el).onsubmit = e => { e.preventDefault(); input.blur(); };
  $('#tags', el).onclick = e => { if (onTcmClick(e, sel, $('#tags', el))) run(); };
  run(); bindList(box);
}
