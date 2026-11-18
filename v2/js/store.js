// שכבת הנתונים: טעינה, מזהים קבועים, אינדקס חיפוש, ושמירה מקומית (מועדפים, אחרונים).
// כל מודול עתידי (פתולוגיות, פורמולות, מקרה חי) ניגש לצמחים רק דרך הקובץ הזה, לפי herb.id.

export const DATA_URL = '../herbs-data.json';   // מקור אחד לנתונים, משותף לגרסה הישנה ולחדשה

// מזהה קבוע לכל צמח, מהשם הלטיני: "Achillea millefolium" → "achillea-millefolium"
export const slug = lat => lat.split(' · ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// אותו טקסט חיפוש בדיוק כמו בגרסה הנוכחית, כדי שתוצאות החיפוש הכללי יהיו זהות
function searchText(h) {
  if (h.s != null) return h.s;
  const [lat, ...en] = h.lat.split(' · ');
  const t = h.tcm.map(b => b.q != null ? b.q + ' ' + b.v : '• ' + b.a + b.li.map(x => '\n   - ' + x).join('')).join('\n');
  const comp = h.comp.map(([s, x]) => (s ? '- ' : '') + x).join('\n');
  return [lat, h.n, en.join(' · '), h.main.join(', '), h.sec.join(', '), t, comp].join(' ').toLowerCase();
}

export const store = { herbs: [], byId: new Map(), images: {}, lessons: {} };

const getJSON = async (url, fallback) => {
  try { const r = await fetch(url); if (!r.ok) throw r.status; return await r.json(); }
  catch (e) { if (fallback !== undefined) return fallback; throw e; }
};

export async function load() {
  const [raw, images, lessons] = await Promise.all([
    getJSON(DATA_URL),
    getJSON('data/images.json', {}),
    getJSON('data/lessons.json', {}),
  ]);
  store.herbs = raw.map((h, i) => {
    const [latin, ...en] = h.lat.split(' · ');
    return Object.assign(h, {
      i, id: slug(h.lat), latin, en: en.join(' · '),
      _s: searchText(h),
      _name: (h.n + ' ' + h.lat).toLowerCase(),
      _uses: [...h.main, ...h.sec, ...h.eff].join(' | ').toLowerCase(),
      _tcm: h.tcm.map(b => b.q != null ? b.q + ' ' + b.v : b.a + ' ' + b.li.join(' ')).join(' ').toLowerCase(),
    });
  });
  store.herbs.forEach(h => store.byId.set(h.id, h));
  store.images = images.herbs || {};
  store.lessons = lessons.herbs || {};
  return store;
}

export const herb = id => store.byId.get(id);
import { autoPhotos } from './commons.js';
// תמונות שנבחרו ידנית ב-data/images.json, ואם אין – תמונות חופשיות מ-Wikimedia Commons
export const photos = h => store.images[h.id]?.length ? store.images[h.id].map(p => typeof p === 'string' ? { src: p } : p) : autoPhotos(h);

// ---- שמירה מקומית בטלפון ----
const KEY = 'herbs2:';
const read = (k, d) => { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch {} };

export const favs = {
  list: () => read('favs', []),
  has: id => read('favs', []).includes(id),
  toggle(id) { const a = read('favs', []); const i = a.indexOf(id); i < 0 ? a.unshift(id) : a.splice(i, 1); write('favs', a); return i < 0; },
};
export const recent = {
  list: () => read('recent', []),
  add(id) { const a = read('recent', []).filter(x => x !== id); a.unshift(id); write('recent', a.slice(0, 12)); },
};
export const learned = {
  has: id => read('learned', []).includes(id),
  add(id) { const a = read('learned', []); if (!a.includes(id)) { a.push(id); write('learned', a); } },
  count: () => read('learned', []).length,
};
export const prefs = { get: (k, d) => read('pref:' + k, d), set: (k, v) => write('pref:' + k, v) };
