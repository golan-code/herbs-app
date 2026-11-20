// כתובות בתוך האפליקציה: #/שם-מסך/ארגומנטים?פרמטרים
export function parse() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').map(decodeURIComponent);
  return { name: parts[0] || '', args: parts.slice(1), q: Object.fromEntries(new URLSearchParams(qs || '')) };
}
const enc = (path, q) => '#/' + path + (q && Object.keys(q).length ? '?' + new URLSearchParams(q) : '');
export const go = (path, q) => { location.hash = enc(path, q); };
// עדכון פרמטרים בלי לבנות את המסך מחדש (למשל תוך כדי הקלדה בחיפוש)
export const setQuery = q => {
  const r = parse();
  for (const k in q) if (q[k] === '' || q[k] == null) delete q[k];
  history.replaceState(null, '', enc([r.name, ...r.args.map(encodeURIComponent)].join('/'), q));
};

// כיוון המעבר בין מסכים, לתנועה: 'back' (חזרה למסך הקודם), 'fwd' (מסך חדש), 'rise' (מעבר בסרגל התחתון),
// או '' כשאותו מסך נבנה מחדש (למשל אחרי טעינת תמונות) — אז בלי תנועה
const trail = [];
export function direction(isTab) {
  const h = location.hash || '#/';
  if (trail[trail.length - 1] === h) return '';
  if (trail[trail.length - 2] === h) { trail.pop(); return 'back'; }
  if (isTab) { trail.length = 0; trail.push(h); return 'rise'; }
  trail.push(h); return 'fwd';
}
