// גישה לאפליקציה: קוד הזמנה אישי (?invite=CODE) שננעל למכשיר הראשון, או כניסת מנהל עם Google.
// ההגנה האמיתית בכללי האבטחה (firestore.rules); כאן רק הזרימה והמסכים.
import { auth, db, A, F, ready, isGoogle, signInGoogle, signOut, loadContent } from './firebase.js';

// דרך ליצור קשר שמופיעה במסכי החסימה. whatsapp: מספר בפורמט בינלאומי בלי + (למשל 972501234567)
export const CONTACT = { whatsapp: '', email: '' };

const KEY = 'herbs2:invite';
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: v => { try { localStorage.setItem(KEY, v); } catch {} },
};

const blocked = kind => Object.assign(new Error(kind), { blocked: kind });

// קוד מהקישור: שומרים בטלפון ומנקים מהכתובת
function codeFromUrl() {
  const u = new URL(location.href);
  const c = (u.searchParams.get('invite') || '').trim();
  if (c) {
    store.set(c);
    u.searchParams.delete('invite');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
  return store.get();
}

// באייפון, האפליקציה שמותקנת ממסך הבית מקבלת אחסון נפרד מ-Safari.
// לכן המניפסט כולל את הקוד, והמעבר מ-Safari לאפליקציה המותקנת מותר ב-30 הדקות הראשונות.
function iosManifest(code) {
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
  const link = document.querySelector('link[rel=manifest]');
  if (!link) return;
  const base = new URL('./', location.href).href;
  fetch(link.href).then(r => r.json()).then(m => {
    m.start_url = base + '?invite=' + encodeURIComponent(code);
    m.scope = base; m.id = base;
    m.icons = m.icons.map(i => ({ ...i, src: new URL(i.src, link.href).href }));
    link.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
  }).catch(() => {});
}

async function claim(uid, code, move) {
  const b = F.writeBatch(db);
  b.update(F.doc(db, 'invites', code), move
    ? { deviceUid: uid, lastSeen: F.serverTimestamp() }
    : { deviceUid: uid, claimedAt: F.serverTimestamp(), lastSeen: F.serverTimestamp() });
  b.set(F.doc(db, 'devices', uid), { code, at: F.serverTimestamp() });
  await b.commit();
}

const ended = d => d.locked || !d.expiresAt || d.expiresAt.toMillis() <= Date.now();

// מחזיר את רשימת הצמחים, או זורק שגיאה עם blocked = סוג מסך החסימה
export async function gate() {
  const code = codeFromUrl();
  let user = await ready();

  if (isGoogle(user)) {
    try { return await loadContent(); }
    catch (e) { if (e.code === 'permission-denied') throw blocked('notadmin'); throw e; }
  }
  if (!code) throw blocked('nocode');
  iosManifest(code);
  if (!user) user = (await A.signInAnonymously(auth)).user;

  const ref = F.doc(db, 'invites', code);
  let snap = null;
  try { snap = await F.getDoc(ref); }
  catch (e) {
    if (e.code !== 'permission-denied') throw e;
    // הקוד לא קיים, או שייך למכשיר אחר. אם נתפס לפני פחות מ-30 דקות, מותר לעבור למכשיר הזה.
    try { await claim(user.uid, code, true); }
    catch { throw blocked('taken'); }
  }
  if (snap) {
    if (!snap.exists()) throw blocked('taken');
    const d = snap.data();
    if (ended(d)) throw blocked('ended');
    if (d.deviceUid !== user.uid) {
      try { await claim(user.uid, code, false); }
      catch (e) { if (e.code === 'permission-denied') throw blocked('taken'); throw e; }
    } else if (!d.lastSeen || Date.now() - d.lastSeen.toMillis() > 10 * 60e3) {
      F.updateDoc(ref, { lastSeen: F.serverTimestamp() }).catch(() => {}); // כניסה אחרונה (לא מחכים)
    }
  }

  try { return await loadContent(); }
  catch (e) {
    if (e.code !== 'permission-denied') throw e;
    // כנראה ננעל או פג תוקף ממש עכשיו
    const s = await F.getDoc(ref).catch(() => null);
    throw blocked(s?.exists() && ended(s.data()) ? 'ended' : 'taken');
  }
}

// ---- מסכי חסימה ----
const TEXT = {
  ended: ['תקופת הניסיון הסתיימה', 'תודה שניסית את האפליקציה. כדי להמשיך, אפשר ליצור איתי קשר.'],
  taken: ['הקישור לא זמין במכשיר הזה', 'כל קישור אישי עובד במכשיר אחד בלבד, והקישור הזה כבר בשימוש במכשיר אחר או שאינו פעיל. אם החלפת מכשיר או דפדפן, צור איתי קשר ואפתח אותו מחדש.'],
  nocode: ['הכניסה בהזמנה בלבד', 'כדי להיכנס צריך קישור אישי. אפשר לבקש אותו ממני.'],
  notadmin: ['החשבון הזה לא מורשה', 'נכנסת עם חשבון Google שאין לו גישה לאפליקציה.'],
  error: ['לא ניתן לטעון את הנתונים', 'בדוק את החיבור לאינטרנט ונסה שוב.'],
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderBlocked(view, kind) {
  const [title, body] = TEXT[kind] || TEXT.error;
  const wa = CONTACT.whatsapp && `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent('שלום, לגבי אפליקציית צמחי המרפא')}`;
  const contact = kind === 'notadmin' || kind === 'error' ? '' :
    wa ? `<a class="btn gate-btn" href="${esc(wa)}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` :
    CONTACT.email ? `<a class="btn gate-btn" href="mailto:${esc(CONTACT.email)}">שליחת מייל</a>` :
    `<p class="gate-note">אפשר לפנות למי ששלח לך את הקישור.</p>`;
  document.body.classList.add('gated');
  view.className = 'scr gate';
  view.innerHTML = `<div class="gate-box">
    <img src="../icons/icon-192.png" alt="" width="72" height="72">
    <h1>${title}</h1><p>${body}</p>${contact}
    ${kind === 'error' ? '<button class="btn gate-btn" data-act="retry">נסה שוב</button>' : ''}
    ${kind === 'notadmin' ? '<button class="btn gate-btn" data-act="out">יציאה מהחשבון</button>' : ''}
    <button class="gate-admin" data-act="admin">כניסת מנהל</button>
  </div>`;
  view.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'retry') location.reload();
    if (act === 'out') { await signOut(); location.reload(); }
    if (act === 'admin') { try { await signInGoogle(); location.reload(); } catch {} }
  };
}
