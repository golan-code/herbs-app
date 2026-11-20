// רשימת התמונות שסומנו כשגויות, להעתקה ושליחה
import { badList } from '../commons.js';
import { E, $, icon } from '../ui.js';
export const nav = '';
export function render(el) {
  const a = badList();
  const text = a.map(x => `${x.n} — ${x.lat} — ${x.page}`).join('\n');
  el.innerHTML = `<div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>תמונות שסומנו כשגויות</h3></div>
    ${a.length ? `<p class="lead">${a.length} תמונות סומנו. הן כבר לא מוצגות בטלפון הזה. אפשר להעתיק את הרשימה ולשלוח אותה, כדי שאקבע לצמחים האלה תמונות נכונות.</p>
    <button type="button" class="cta" id="cp">העתקת הרשימה</button>
    <ul class="badl">${a.map(x => `<li><b>${E(x.n)}</b> <small dir="ltr">${E(x.lat)}</small></li>`).join('')}</ul>`
    : '<p class="empty">עוד לא סומנו תמונות שגויות. בבועת התמונה יש כפתור "התמונה לא של הצמח הזה".</p>'}`;
  const b = $('#cp', el); if (b) b.onclick = async () => { try { await navigator.clipboard.writeText(text); b.textContent = 'הועתק ✓'; } catch { prompt('העתיקו:', text); } };
}
