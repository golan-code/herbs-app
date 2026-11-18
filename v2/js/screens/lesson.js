// "הצמח היומי": כל יום שיעור מסודר על צמח אחד.
// השיעור נבנה אוטומטית מהנתונים. אפשר לכתוב שיעור אישי לצמח ב-data/lessons.json והוא יחליף את הפתיחה ואת הנקודות לזכירה.
import { store, herb, learned } from '../store.js';
import { dailyHerb, similar } from '../search.js';
import { E, $, icon, thumb } from '../ui.js';
import { tcmBlocks, tcmTags, pills } from './herb.js';

export const nav = 'lesson';  // מודגש בסרגל התחתון

const TEMPS = ['חם', 'ניטרלי', 'קריר', 'קר'];
const fmt = d => d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

// בחירה קבועה (לא אקראית) לפי הצמח, כדי שהשאלות לא ישתנו בכל פתיחה
const pick = (arr, seed, n) => { const a = [...arr], out = []; let s = seed; while (a.length && out.length < n) { s = (s * 9301 + 49297) % 233280; out.push(a.splice(s % a.length, 1)[0]); } return out; };

function quiz(h) {
  const qs = [];
  const temp = h.c.m[0];
  if (temp) qs.push({ q: `מה הטמפרטורה של ${h.n} במבט הסיני?`, opts: TEMPS, a: temp });
  if (h.main.length) {
    const own = new Set([...h.main, ...h.sec].map(x => x.toLowerCase()));
    const pool = [...new Set(store.herbs.filter(x => x !== h).flatMap(x => x.main))].filter(x => !own.has(x.toLowerCase()));
    const wrong = pick(pool, h.i + 7, 3);
    const opts = pick([h.main[0], ...wrong], h.i + 3, 4);
    qs.push({ q: `לאיזה מהמצבים הבאים משתמשים ב${h.n} כשימוש עיקרי?`, opts, a: h.main[0] });
  }
  if (h.c.a.length) {
    const others = pick(['מניע דם', 'מזין יין', 'מחזק יאנג', 'מסלק רוח', 'מחמם / מגרש קור', 'מרגיע נפש / שן', 'מלחלח / מייצר נוזלים', 'מסלק חום / אש', 'מזין דם'].filter(x => !h.c.a.includes(x)), h.i + 11, 3);
    qs.push({ q: `איזו מהפעולות הבאות שייכת ל${h.n}?`, opts: pick([h.c.a[0], ...others], h.i + 5, 4), a: h.c.a[0] });
  }
  return qs;
}

function points(h) {
  const p = [];
  const qual = [...h.c.t, ...h.c.m, ...h.c.l];
  if (qual.length) p.push(`איכויות: ${qual.join(', ')}.`);
  const act = h.tcm.find(b => b.a); if (act) p.push(`פעולה מרכזית: ${act.a}.`);
  if (h.main.length) p.push(`פונים אליו בעיקר ב: ${h.main.slice(0, 3).join(', ')}.`);
  p.push(`${h.preg[1]}. ${h.nurse[1]}.`);
  return p;
}

export function render(el, r) {
  const today = dailyHerb();
  const h = r.args[0] ? herb(r.args[0]) : today;
  if (!h) { el.innerHTML = '<p class="empty">הצמח לא נמצא.</p>'; return; }
  const isToday = h === today;
  const own = store.lessons[h.id] || {};
  const qual = h.tcm.find(b => b.q != null);
  const sims = similar(h).slice(0, 4);
  const comp = h.comp.filter(([s]) => !s).slice(0, 6).map(([, x]) => x);
  const past = [1, 2, 3, 4, 5, 6].map(k => { const d = new Date(); d.setDate(d.getDate() - k); return [d, dailyHerb(d)]; });

  el.innerHTML = `
  <div class="bar"><a href="#" class="backb" aria-label="חזרה">${icon('back')}</a><h3>${isToday ? 'השיעור של היום' : 'שיעור על צמח'}</h3></div>
  <article class="lesson">
    <div class="lhead">${thumb(h, 'th lg')}<div>
      ${isToday ? `<span class="kick">${icon('sun')} ${fmt(new Date())}</span>` : ''}
      <h1>${E(h.n)}</h1><small dir="ltr">${E(h.latin)}${h.en ? ' · ' + E(h.en) : ''}</small>
      <span class="part">${E(h.part)}</span></div></div>

    <section><h2>היכרות</h2>
      <p>${E(own.intro || `${h.n} (${h.latin}) הוא צמח שמשתמשים בו בעיקר ב${h.main.slice(0, 3).join(', ')}. ${qual ? `במבט הסיני ${qual.q.replace(':', '')}: ${qual.v}` : ''}`)}</p>
      ${own.text ? `<p>${E(own.text)}</p>` : ''}
    </section>

    <section><h2>שימושים</h2>
      <h4>עיקריים</h4><div class="chips main">${h.main.map(x => `<span>${E(x)}</span>`).join('')}</div>
      ${h.sec.length ? `<details><summary>ועוד ${h.sec.length} שימושים משניים</summary><div class="chips">${h.sec.map(x => `<span>${E(x)}</span>`).join('')}</div></details>` : ''}
      <h4>איך הוא פועל</h4><div class="chips">${h.eff.map(x => `<span>${E(x)}</span>`).join('')}</div>
    </section>

    <section><h2>במבט הסיני</h2>${tcmTags(h)}${tcmBlocks(h)}</section>

    ${comp.length ? `<section><h2>רכיבים פעילים עיקריים</h2><p>${E(comp.join(' · '))}</p></section>` : ''}

    <section class="warnbox"><h2>${icon('warn')} בטיחות</h2><p>${E(h.safe)}</p>${pills(h)}</section>

    <section class="remember"><h2>נקודות לזכירה</h2><ul>${(own.points || points(h)).map(x => `<li>${E(x)}</li>`).join('')}</ul></section>

    <section><h2>בדקו את עצמכם</h2>${quiz(h).map((x, k) => `<div class="quiz" data-a="${E(x.a)}"><p><b>${k + 1}.</b> ${E(x.q)}</p><div>${x.opts.map(o => `<button type="button" data-o="${E(o)}">${E(o)}</button>`).join('')}</div></div>`).join('')}</section>

    ${sims.length ? `<section><h2>צמחים דומים לחזרה</h2><div class="chiprow">${sims.map(x => `<a href="#/lesson/${x.h.id}">${E(x.h.n)} <i>${x.score}%</i></a>`).join('')}</div></section>` : ''}

    <div class="lfoot">
      <button type="button" class="cta" id="done">${learned.has(h.id) ? `${icon('check')} נלמד` : 'סיימתי ללמוד'}</button>
      <a class="btn2" href="#/herb/${h.id}">לעמוד הצמח</a>
    </div>
    <p class="hint">למדת עד עכשיו <b id="lc">${learned.count()}</b> מתוך ${store.herbs.length} צמחים.</p>

    ${isToday ? `<section><h2>שיעורים מהימים הקודמים</h2><div class="past">${past.map(([d, x]) => `<a href="#/lesson/${x.id}"><small>${fmt(d)}</small><b>${E(x.n)}</b>${learned.has(x.id) ? icon('check') : ''}</a>`).join('')}</div></section>` : ''}
  </article>`;

  el.onclick = e => {
    const o = e.target.closest('[data-o]');
    if (o) { const qz = o.closest('.quiz'); if (qz.classList.contains('done')) return; qz.classList.add('done');
      qz.querySelectorAll('[data-o]').forEach(b => b.classList.toggle('right', b.dataset.o === qz.dataset.a)); if (o.dataset.o !== qz.dataset.a) o.classList.add('wrong'); return; }
    if (e.target.closest('#done')) { learned.add(h.id); $('#done', el).innerHTML = icon('check') + ' נלמד'; $('#lc', el).textContent = learned.count(); }
  };
}
