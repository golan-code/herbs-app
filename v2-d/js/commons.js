// תמונות חופשיות מ-Wikimedia Commons לצמחים שאין להם תמונה ב-data/images.json.
// החיפוש נעשה מהטלפון לפי השם הלטיני, נשמר בטלפון ל-30 יום, והתמונות עצמן נשמרות במטמון אחרי צפייה.
// רק תמונות ברישיון חופשי (ברירת המחדל של pageimages ובדיקת רישיון ב-Commons).
import { store } from './store.js';

const KEY = 'herbs2:commons2', TTL = 30 * 864e5, W = 640;
const API = 'https://en.wikipedia.org/w/api.php', CAPI = 'https://commons.wikimedia.org/w/api.php';
let cache = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {} };

// גרסאות של השם הלטיני, מהטובה ביותר: "Cola vera \ nitida" → Cola vera, Cola nitida, Cola
export function latinNames(lat) {
  const base = lat.split(' · ')[0].replace(/\b(radix|folia|herba|cortex|fructus|semen|spp\.?)\b/gi, '');
  const words = base.match(/[A-Za-z][a-z-]+/g) || [];
  const gen = words.filter(w => /^[A-Z]/.test(w)), ep = words.filter(w => /^[a-z]/.test(w));
  return [...new Set(gen.flatMap(g => ep.map(e => `${g} ${e}`)))]; // רק שם מין מלא, לא סוג בלבד (שם הסוג הביא צמחים אחרים)
}

const q = async (url, params) => {
  const u = url + '?' + new URLSearchParams({ ...params, format: 'json', formatversion: 2, origin: '*' });
  const r = await fetch(u); if (!r.ok) throw r.status; return r.json();
};
const toPhoto = (file, thumb) => ({ src: thumb, credit: 'Wikimedia Commons', page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(file.replace(/ /g, '_')), auto: true });

// תמונה ראשית לכל הצמחים: כמה בקשות מרוכזות (50 שמות בכל אחת)
export async function loadLeadPhotos(onDone) {
  if (cache._t && Date.now() - cache._t < TTL) return;
  const todo = store.herbs.filter(h => !store.images[h.id]?.length);
  const res = {};
  for (let round = 0; round < 2; round++) {
    const ask = new Map(); // שם → מזהי צמחים
    for (const h of todo) if (!res[h.id]) { const n = latinNames(h.lat)[round]; if (n) ask.set(n, [...(ask.get(n) || []), h.id]); }
    const names = [...ask.keys()];
    for (let i = 0; i < names.length; i += 50) {
      let j; try { j = await q(API, { action: 'query', titles: names.slice(i, i + 50).join('|'), redirects: 1, prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: W }); } catch { return; }
      const back = t => { for (const m of [...(j.query.normalized || []), ...(j.query.redirects || [])]) if (m.to === t) t = m.from; return t; };
      const unback = t => { let x = t; for (let k = 0; k < 3; k++) x = back(x); return x; };
      for (const p of j.query?.pages || []) if (p.thumbnail && p.pageimage) {
        for (const id of ask.get(unback(p.title)) || []) if (!res[id]) res[id] = [toPhoto('File:' + p.pageimage, p.thumbnail.source)];
      }
    }
  }
  cache = { _t: Date.now(), ...res }; save(); onDone?.();
}

// עוד תמונות לצמח אחד (עד 3 סך הכול), נטען כשפותחים את הבועה או את עמוד הצמח
export async function morePhotos(h) {
  return null; // כבוי: החיפוש ב-Commons הביא הרבה תמונות שגויות. נשארת רק התמונה הראשית מוויקיפדיה
  const cur = cache[h.id] || [];
  if (store.images[h.id]?.length || cur.length >= 3 || cache['more:' + h.id]) return null;
  const name = latinNames(h.lat)[0]; if (!name) return null;
  try {
    const s = await q(CAPI, { action: 'query', list: 'search', srnamespace: 6, srlimit: 12, srsearch: `intitle:"${name}" filetype:bitmap` });
    const bad = /herbarium|specimen|map|distribution|illustration|köhler|drawing|plate|stamp|logo|packet|\.svg/i;
    const have = new Set(cur.map(p => p.page));
    const titles = (s.query?.search || []).map(x => x.title).filter(t => !bad.test(t)).slice(0, 6);
    if (!titles.length) { cache['more:' + h.id] = 1; save(); return null; }
    const ii = await q(CAPI, { action: 'query', titles: titles.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: W });
    const add = [];
    for (const p of ii.query?.pages || []) {
      const i = p.imageinfo?.[0]; if (!i || !/jpeg|png|webp/.test(i.mime)) continue;
      const lic = i.extmetadata?.LicenseShortName?.value || '';
      if (!/^(cc|public domain|pd|gfdl)/i.test(lic)) continue;
      const ph = toPhoto(p.title, i.thumburl || i.url); ph.credit = 'Wikimedia Commons · ' + lic;
      if (!have.has(ph.page)) add.push(ph);
    }
    cache[h.id] = [...cur, ...add].slice(0, 3); cache['more:' + h.id] = 1; save();
    return cache[h.id];
  } catch { return null; }
}

// תמונות שסומנו כשגויות: לא מוצגות יותר, ונאספות לרשימה שאפשר להעתיק ולשלוח
const BAD = 'herbs2:badphotos';
export const badList = () => { try { return JSON.parse(localStorage.getItem(BAD)) || []; } catch { return []; } };
export function markBad(h, page) { const a = badList().filter(x => x.page !== page); a.push({ id: h.id, n: h.n, lat: h.latin, page }); try { localStorage.setItem(BAD, JSON.stringify(a)); } catch {} }
export const autoPhotos = h => { const bad = new Set(badList().map(x => x.page)); return (cache[h.id] || []).filter(p => !bad.has(p.page)); };
