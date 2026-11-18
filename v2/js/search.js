// חיפוש וסינון. הכללים זהים לגרסה הנוכחית; נוספו מצבי חיפוש לפי לשונית.
import { store } from './store.js';

export const PARTS = ['שורש', 'פקעת', 'עלים', 'פרחים', 'פרי וזרעים', 'קליפה וגזע', 'הצמח כולו / נוף', 'פטרייה / שרף / אחר'];
export const TCM_GROUPS = [
  ['t', 'טעם', ['מר', 'מתוק', 'פיקנטי / חריף', 'מלוח', 'חמוץ', 'מצמת / סופח', 'ארומתי', 'תפל']],
  ['m', 'טמפרטורה', ['חם', 'ניטרלי', 'קריר', 'קר']],
  ['l', 'לחות', ['יבש', 'לח']],
  ['a', 'פעולה רפואית', ["מניע צ'י", "מעצים / מחזק צ'י", 'מניע דם', 'מזין דם', 'מזין יין', 'מחזק יאנג', 'מסלק חום / אש', 'מסלק חום ריק', 'מסלק / מייבש לחות', 'מסלק ליחה / מכייח', 'מסלק רוח', 'מחמם / מגרש קור', 'מסלק רעילות', 'מרגיע נפש / שן', 'סופח / עוצר הפרשות ודימום', 'מלחלח / מייצר נוזלים', 'מקל על כאב', 'מסלק גודש / מנקז', 'מייזע', 'מאזן מחזור / רחם']],
];

export const emptySel = () => ({ t: [], m: [], l: [], a: [] });
export const selCount = sel => Object.values(sel).reduce((s, x) => s + x.length, 0);
const tcmOk = (h, sel) => Object.entries(sel).every(([k, vs]) => vs.every(v => h.c[k].includes(v)));

// mode: 'all' | 'name' | 'uses' | 'tcm'
export function find({ q = '', mode = 'all', part = '', sel = emptySel() } = {}) {
  const v = q.trim().toLowerCase();
  const field = { all: '_s', name: '_name', uses: '_uses', tcm: '_tcm' }[mode];
  let res = store.herbs.filter(h => (!v || h[field].includes(v)) && (!part || h.p.includes(part)) && tcmOk(h, sel));
  if (v && mode === 'name') res = rank(res, h => h.n.toLowerCase().startsWith(v) || h.latin.toLowerCase().startsWith(v) ? 0 : 1);
  if (v && mode === 'uses') res = rank(res, h => h.main.some(x => x.toLowerCase().includes(v)) ? 0 : h.sec.some(x => x.toLowerCase().includes(v)) ? 1 : 2);
  return res;
}
const rank = (a, f) => a.map((h, k) => [f(h), k, h]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).map(x => x[2]);

// השימושים שמתאימים לחיפוש, להצגה בכרטיס
export function matchedUses(h, q) {
  const v = q.trim().toLowerCase();
  if (!v) return h.main.slice(0, 3);
  const m = [...h.main, ...h.sec, ...h.eff].filter(x => x.toLowerCase().includes(v));
  return [...new Set([...m, ...h.main])].slice(0, 3);
}

// דמיון במבט הסיני: אותו חישוב כמו בגרסה הנוכחית (משקלות: טעם 2, טמפרטורה 2, לחות 1, פעולות 3), סף 40%
export function score(a, b) {
  let s = 0, max = 0;
  for (const [k, w] of [['t', 2], ['m', 2], ['l', 1], ['a', 3]]) {
    const A = new Set(a.c[k]), B = new Set(b.c[k]); const u = new Set([...A, ...B]).size;
    if (!u) continue; let inter = 0; A.forEach(x => B.has(x) && inter++); s += w * inter / u; max += w;
  }
  return max ? Math.round(100 * s / max) : 0;
}
export function similar(ref) {
  return store.herbs.filter(h => h !== ref).map(h => ({ h, score: score(ref, h) }))
    .filter(x => x.score >= 40).sort((x, y) => y.score - x.score || x.h.i - y.h.i);
}

export function tcmCounts() {
  const c = {};
  for (const h of store.herbs) for (const k of 'tmla') for (const v of h.c[k]) c[k + v] = (c[k + v] || 0) + 1;
  return c;
}
export function partCounts() {
  return Object.fromEntries(PARTS.map(p => [p, store.herbs.filter(h => h.p.includes(p)).length]));
}

// הצמח היומי: סדר קבוע ומעורבב, כך שכל הצמחים עוברים לפני שחוזרים על צמח
export function dailyHerb(date = new Date()) {
  const n = store.herbs.length;
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 864e5);
  const step = 97; // זר ל-233, עובר על כל הצמחים
  return store.herbs[(day * step) % n];
}
