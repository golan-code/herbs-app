import { store, herb, recent, prefs } from '../store.js';
import { PARTS, dailyHerb } from '../search.js';
import { E, $, icon, PART_ICON, thumb, segHtml, setSeg } from '../ui.js';
import { go } from '../router.js';
import { abcList, bindAbc } from './all.js';
import { badList } from '../commons.js';
import { trial } from '../access.js';
import { auth, isGoogle } from '../firebase.js';

// כפתור לדף ניהול הגישה: רק למנהל (מחובר עם Google). ההגנה האמיתית בכללי האבטחה.
const adminLink = () => isGoogle(auth.currentUser) ? '<a class="pill adm" href="admin.html">ניהול גישה</a>' : '';

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

export const tabsHtml = mode => segHtml(TABS, mode, 'tabs');
// מעבר לשונית בלי לבנות אותה מחדש (כדי שהאליפסה תגלוש), ועדכון הטקסט בשדה החיפוש
export function setTabs(el, mode) {
  setSeg($('.seg', el), mode);
  const inp = $('.sbar input', el); if (inp) inp.placeholder = (TABS.find(t => t[0] === mode) || TABS[0])[2];
}
export function searchBar(mode, q = '') {
  const ph = (TABS.find(t => t[0] === mode) || TABS[0])[2];
  return `<form class="sbar" role="search">${icon('search')}<input name="q" type="search" enterkeyhint="search" autocomplete="off" value="${E(q)}" placeholder="${E(ph)}" aria-label="חיפוש">
  <button class="go" aria-label="חיפוש">${icon('go')}</button></form>`;
}

// השם לפנייה: למנהל מחשבון Google; למשתמש ניסיון רק אם access.js מעביר אותו (trial.name).
// מעדיפים שם בעברית: שם שכבר כתוב בעברית, או תרגום של שם לועזי מוכר (HE_NAMES). אחרת השם כמו שהוא.
const HE_NAMES = { golan: 'גולן' };
function firstName() {
  const n = (isGoogle(auth.currentUser) ? auth.currentUser.displayName : trial.name) || '';
  const w = n.trim().split(/\s+/), he = w.find(x => /[\u0590-\u05FF]/.test(x));
  return he || HE_NAMES[(w[0] || '').toLowerCase()] || w[0] || '';
}

// הצמח היומי: כרטיס ורוד-רך עם תמונה מרחפת
function dailyCard() {
  const d = dailyHerb(); if (!d) return '';
  return `<a class="daily" href="#/lesson"><div><span class="kick">${icon('sun')} הצמח היומי</span><b>${E(d.n)}</b><small dir="ltr">${E(d.latin)}</small>
    <p>${E(d.main.slice(0, 3).join(', '))}</p><span class="cta-s">לשיעור של היום</span></div>${thumb(d, 'th fl')}</a>`;
}

export function render(el) {
  let mode = prefs.get('tab', 'name');
  const rec = recent.list().map(herb).filter(Boolean).slice(0, 3);
  el.innerHTML = `
  <header class="hhead"><div><h1>שלום${firstName() ? ', ' + E(firstName()) : ''}</h1><p class="hq">איזה צמח נפגוש היום?</p>${trialNote()}</div><div class="hside"><span class="pill">${store.herbs.length} צמחים</span>${adminLink()}</div></header>
  <div id="tabs">${tabsHtml(mode)}</div>
  <div id="sb">${searchBar(mode)}</div>
  <div class="prow">${PARTS.map(p => `<a href="#/results?part=${encodeURIComponent(p)}">${icon(PART_ICON[p])}<span>${E(p)}</span></a>`).join('')}</div>
  ${dailyCard()}
  ${rec.length ? `<div class="chiprow recent"><small>אחרונים:</small>${rec.map(h => `<a href="#/herb/${h.id}" dir="auto">${E(h.n.trim() || h.latin)}</a>`).join('')}<button type="button" class="rclr">נקה</button></div>` : ''}
  ${badList().length ? `<a class="lesson-l" href="#/badphotos">${icon('warn')} ${badList().length} תמונות סומנו כשגויות · לרשימה</a>` : ''}
  <h2 class="count">כל הצמחים <span class="sub">לפי א-ב</span></h2>
  ${abcList()}
  `;
  const bind = () => {
    $('#tabs', el).onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      mode = b.dataset.m; prefs.set('tab', mode);
      setTabs(el, mode);
    };
    $('form', el).onsubmit = e => {
      e.preventDefault(); const v = $('input', el).value.trim();
      if (!v && mode === 'tcm') return go('tcm');
      go('results', { mode, q: v });
    };
  };
  bind();
  bindAbc(el);
  const rc = $('.rclr', el);
  if (rc) rc.onclick = () => { recent.clear(); rc.parentElement.remove(); };
}
