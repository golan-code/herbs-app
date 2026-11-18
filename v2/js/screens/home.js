import { store, herb, recent, prefs } from '../store.js';
import { PARTS } from '../search.js';
import { E, $, icon, PART_ICON } from '../ui.js';
import { go } from '../router.js';
import { abcList, bindAbc } from './all.js';
import { badList } from '../commons.js';
import { trial } from '../access.js';

// למשתמשי ניסיון: כמה זמן נשאר (מנהל לא רואה)
function trialNote() {
  if (!trial.ends) return '';
  const days = Math.ceil((trial.ends - Date.now()) / 864e5);
  const txt = days <= 1 ? 'היום האחרון לניסיון' : `ניסיון · נשארו ${days} ימים`;
  return `<span class="trial-left${days <= 3 ? ' soon' : ''}">${txt}</span>`;
}

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
  const rec = recent.list().map(herb).filter(Boolean).slice(0, 8);
  el.innerHTML = `
  <header class="hhead"><div><small>${greeting()}</small><h1>צמחי מרפא</h1>${trialNote()}</div><span class="pill">${store.herbs.length} צמחים</span></header>
  <div id="tabs">${tabsHtml(mode)}</div>
  <div id="sb">${searchBar(mode)}</div>
  <div class="prow">${PARTS.map(p => `<a href="#/results?part=${encodeURIComponent(p)}">${icon(PART_ICON[p])}<span>${E(p)}</span></a>`).join('')}</div>
  ${rec.length ? `<div class="chiprow recent"><small>אחרונים:</small>${rec.map(h => `<a href="#/herb/${h.id}">${E(h.n)}</a>`).join('')}</div>` : ''}
  ${badList().length ? `<a class="lesson-l" href="#/badphotos">${icon('warn')} ${badList().length} תמונות סומנו כשגויות · לרשימה</a>` : ''}
  <h2 class="count">כל הצמחים <span class="sub">לפי א-ב</span></h2>
  ${abcList()}
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
  bindAbc(el);
}
