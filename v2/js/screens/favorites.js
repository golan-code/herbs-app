import { favs, herb } from '../store.js';
import { $, icon } from '../ui.js';
import { list, bindList } from './results.js';

let redraw = null;
document.addEventListener('favs', () => redraw?.());

export function render(el) {
  const draw = () => {
    const items = favs.list().map(herb).filter(Boolean);
    el.innerHTML = `<div class="bar"><h3>מועדפים</h3></div>
      ${items.length ? `<h2 class="count">${items.length} צמחים שמורים בטלפון</h2><div class="list">${list(items)}</div>`
        : `<div class="empty">${icon('heart', 'big')}<p>עוד אין מועדפים.</p><p>אפשר לסמן לב בעמוד של צמח או בבועת התמונה.</p></div>`}`;
    const box = $('.list', el); if (box) bindList(box);
  };
  draw();
  redraw = () => { if (el.classList.contains('scr-fav')) draw(); };
}
