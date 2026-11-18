import { store, herb, recent, learned, prefs } from '../store.js';
import { PARTS, partCounts, dailyHerb } from '../search.js';
import { E, $, icon, thumb, PART_ICON } from '../ui.js';
import { go } from '../router.js';

export const TABS = [
  ['name', 'צמח', 'חיפוש צמח…'],
  ['uses', 'מצב / שימוש', 'מצב או שימוש, למשל אקזמה…'],
  ['tcm', 'מבט סיני', "פעולה או דפוס, למשל תקיעות צ'י…"],
];

export function tabsHtml(mode) {
  return `<div class="tabs" role="tablist">${TABS.map(([m, t]) => `<button type="button" role="tab" data-m="${m}" class="${m === mode ? 'on' : ''}">${t}</button>`).join('')}</div>`;
}
export function searchBar(mode, q = '') {
  const ph = (TABS.find(t => t[0] === mode) || TABS[0])[2];
  return `<form class="sbar" role="search">${icon('search')}<input name="q" type="search" enterkeyhint="search" autocomplete="off" value="${E(q)}" placeholder="${E(ph)}" aria-label="חיפוש">
  <button class="go" aria-label="חיפוש">${icon('go')}</button></form>`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}

export function render(el) {
  let mode = prefs.get('tab', 'name');
  const pc = partCounts();
  const d = dailyHerb();
  const rec = recent.list().map(herb).filter(Boolean).slice(0, 8);
  el.innerHTML = `
  <header class="hhead"><div><small>${greeting()}</small><h1>צמחי מרפא</h1></div><span class="pill">${store.herbs.length} צמחים</span></header>
  <div id="tabs">${tabsHtml(mode)}</div>
  <div id="sb">${searchBar(mode)}</div>
  <h2>לפי החלק בשימוש</h2>
  <div class="tiles">${PARTS.map(p => `<a href="#/results?part=${encodeURIComponent(p)}">${icon(PART_ICON[p])}<span>${E(p)}</span><i>${pc[p]}</i></a>`).join('')}</div>
  <h2>הצמח היומי</h2>
  <a class="daily" href="#/lesson">
    ${thumb(d)}
    <div><span class="kick">${icon('book')} השיעור של היום${learned.has(d.id) ? ' · נלמד ✓' : ''}</span>
    <b>${E(d.n)}</b><small dir="ltr">${E(d.latin)}</small>
    <p>${E(d.main.slice(0, 3).join(', '))}</p>
    <span class="cta-s">לפתוח את השיעור</span></div>
  </a>
  ${rec.length ? `<h2>אחרונים שצפית</h2><div class="chiprow">${rec.map(h => `<a href="#/herb/${h.id}">${E(h.n)}</a>`).join('')}</div>` : ''}
  `;
  const bind = () => {
    $('#tabs', el).onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      mode = b.dataset.m; prefs.set('tab', mode);
      const v = $('input', el).value;
      $('#tabs', el).innerHTML = tabsHtml(mode); $('#sb', el).innerHTML = searchBar(mode, v); bind();
    };
    $('form', el).onsubmit = e => {
      e.preventDefault(); const v = $('input', el).value.trim();
      if (!v && mode === 'tcm') return go('tcm');
      go('results', { mode, q: v });
    };
  };
  bind();
}
