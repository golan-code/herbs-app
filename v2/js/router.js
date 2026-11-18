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
