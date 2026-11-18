// רכיב סינון משותף: חלק הצמח ותגיות סיניות (כמו בגרסה הנוכחית)
import { PARTS, TCM_GROUPS, tcmCounts, partCounts, selCount } from '../search.js';
import { E } from '../ui.js';

export function partsHtml(part) {
  const pc = partCounts();
  return `<div class="flt" id="parts"><button type="button" data-v="" class="${part ? '' : 'on'}">הכול</button>${PARTS.map(p => `<button type="button" data-v="${E(p)}" class="${p === part ? 'on' : ''}">${E(p)} (${pc[p]})</button>`).join('')}</div>`;
}
export function tcmHtml(sel) {
  const c = tcmCounts();
  return TCM_GROUPS.map(([k, t, vs]) => `<div class="grp"><b>${t}</b>${vs.map(v => `<button type="button" data-k="${k}" data-v="${E(v)}" class="${sel[k].includes(v) ? 'on' : ''}">${E(v)} <i>${c[k + v] || 0}</i></button>`).join('')}</div>`).join('')
    + `<div class="grp"><button type="button" class="clr" data-clr>נקה סינון סיני</button><span class="hint">בחירה של כמה תגיות מציגה רק צמחים שיש להם את כולן.</span></div>`;
}
// מחזיר true אם משהו השתנה
export function onTcmClick(e, sel, box) {
  const b = e.target.closest('button'); if (!b) return false;
  if (b.hasAttribute('data-clr')) { for (const k in sel) sel[k] = []; box.querySelectorAll('button.on').forEach(x => x.classList.remove('on')); return true; }
  if (!b.dataset.k) return false;
  const a = sel[b.dataset.k], i = a.indexOf(b.dataset.v); i < 0 ? a.push(b.dataset.v) : a.splice(i, 1); b.classList.toggle('on'); return true;
}
export const selLabel = sel => { const n = selCount(sel); return n ? `(${n} נבחרו)` : ''; };
