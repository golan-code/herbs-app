// גישה לאפליקציה: קוד הזמנה אישי (?invite=CODE) שננעל למכשיר הראשון, או כניסת מנהל עם Google.
// ההגנה האמיתית בכללי האבטחה (firestore.rules); כאן רק הזרימה והמסכים.
import { auth, db, A, F, ready, isGoogle, signInGoogle, signOut, loadContent } from './firebase.js';

// דרך ליצור קשר שמופיעה במסכי החסימה. whatsapp: מספר בפורמט בינלאומי בלי + (למשל 972501234567)
export const CONTACT = { whatsapp: '972523321490', email: '' };
export const MAX_MOVES = 3;      // חייב להתאים ל-firestore.rules
const FREE_MS = 30 * 60e3;      // חלון המעבר החינם, גם הוא כמו בכללים

const KEY = 'herbs2:invite';
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: v => { try { localStorage.setItem(KEY, v); } catch {} },
};

// מועד סיום הניסיון של המשתמש הנוכחי (null למנהל), להצגה במסך הבית
export const trial = { ends: null };

const blocked = (kind, info = {}) => Object.assign(new Error(kind), { blocked: kind, ...info });

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
// לכן המניפסט כולל את הקוד, והמעבר מ-Safari לאפליקציה המותקנת חינם ב-30 הדקות הראשונות.
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

// kind: 'fresh' (קוד פנוי), 'free' (מעבר בחלון החינם), 'count' (מעבר נספר)
async function take(uid, code, kind, moves = 0) {
  const b = F.writeBatch(db), ts = F.serverTimestamp();
  b.update(F.doc(db, 'invites', code),
    kind === 'fresh' ? { deviceUid: uid, claimedAt: ts, lastSeen: ts }
    : kind === 'free' ? { deviceUid: uid, lastSeen: ts }
    : { deviceUid: uid, lastSeen: ts, moves: moves + 1 });
  b.set(F.doc(db, 'devices', uid), { code, at: ts });
  await b.commit();
}

const ended = d => d.locked || !d.expiresAt || d.expiresAt.toMillis() <= Date.now();
const inFree = d => d.claimedAt && Date.now() < d.claimedAt.toMillis() + FREE_MS;

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
  const snap = await F.getDoc(ref);
  if (!snap.exists()) throw blocked('invalid');
  const d = snap.data(), name = d.name;
  if (ended(d)) throw blocked('ended', { name });

  if (!d.deviceUid) await take(user.uid, code, 'fresh');
  else if (d.deviceUid !== user.uid) {
    if (inFree(d)) await take(user.uid, code, 'free');
    else {
      const left = MAX_MOVES - (d.moves || 0);
      // מעבר נספר רק בלחיצה, כדי שפתיחה מקרית במכשיר ישן לא "תשרוף" מעבר
      throw blocked(left > 0 ? 'moved' : 'limit', { name, left, move: () => take(user.uid, code, 'count', d.moves || 0) });
    }
  } else if (!d.lastSeen || Date.now() - d.lastSeen.toMillis() > 10 * 60e3) {
    F.updateDoc(ref, { lastSeen: F.serverTimestamp() }).catch(() => {}); // כניסה אחרונה (לא מחכים)
  }

  trial.ends = d.expiresAt.toMillis();
  try { return await loadContent(); }
  catch (e) {
    if (e.code !== 'permission-denied') throw e;
    // כנראה ננעל, פג תוקף או הועבר ממש עכשיו
    const s2 = await F.getDoc(ref).catch(() => null);
    throw blocked(s2?.exists() && ended(s2.data()) ? 'ended' : 'invalid', { name });
  }
}

// ---- מסכי חסימה ----
const TEXT = {
  ended: ['תקופת הניסיון הסתיימה', 'תודה שניסית את האפליקציה. כדי להמשיך, אפשר ליצור איתי קשר.', 'תקופת הניסיון שלי הסתיימה'],
  moved: ['הקישור פעיל במכשיר אחר', 'הקישור האישי עובד בכל פעם במכשיר אחד. אפשר להעביר אותו למכשיר הזה, ואז הוא יפסיק לעבוד במכשיר הקודם.', ''],
  limit: ['הקישור הועבר יותר מדי פעמים', 'הקישור כבר הועבר בין מכשירים את מספר הפעמים המרבי. צור איתי קשר ואפתח אותו מחדש.', 'הקישור שלי הועבר יותר מדי פעמים, אפשר לפתוח אותו מחדש?'],
  invalid: ['הקישור לא פעיל', 'הקישור לא קיים או שבוטל. אפשר לבקש קישור חדש.', 'הקישור שלי לא פעיל'],
  nocode: ['הכניסה בהזמנה בלבד', 'כדי להיכנס צריך קישור אישי. אפשר לבקש אותו ממני.', 'אשמח לקבל קישור לאפליקציה'],
  notadmin: ['החשבון הזה לא מורשה', 'נכנסת עם חשבון Google שאין לו גישה לאפליקציה.', ''],
  error: ['לא ניתן לטעון את הנתונים', 'בדוק את החיבור לאינטרנט ונסה שוב.', ''],
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderBlocked(view, err) {
  const kind = err.blocked || 'error';
  const [title, body, ask] = TEXT[kind] || TEXT.error;
  const msg = ['שלום, לגבי אפליקציית צמחי המרפא', err.name && `(${err.name})`, ask && `- ${ask}`].filter(Boolean).join(' ');
  const contact = !ask ? '' : CONTACT.whatsapp
    ? `<a class="btn gate-btn${kind === 'moved' ? ' alt' : ''}" href="https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>`
    : `<p class="gate-note">אפשר לפנות למי ששלח לך את הקישור.</p>`;
  document.body.classList.add('gated');
  view.className = 'scr gate';
  view.innerHTML = `<div class="gate-box">
    <img src="../icons/icon-192.png" alt="" width="72" height="72">
    <h1>${title}</h1><p>${body}</p>
    ${kind === 'moved' ? `<button class="btn gate-btn" data-act="move">להעביר למכשיר הזה</button>
      <p class="gate-note">${err.left === 1 ? 'נשאר מעבר אחד' : `נשארו ${err.left} מעברים`} מתוך ${MAX_MOVES}.</p>` : ''}
    ${contact}
    ${kind === 'error' ? '<button class="btn gate-btn" data-act="retry">נסה שוב</button>' : ''}
    ${kind === 'notadmin' ? '<button class="btn gate-btn" data-act="out">יציאה מהחשבון</button>' : ''}
    <button class="gate-admin" data-act="admin">כניסת מנהל</button>
  </div>`;
  view.onclick = async e => {
    const b = e.target.closest('[data-act]'), act = b?.dataset.act;
    if (act === 'retry') location.reload();
    if (act === 'out') { await signOut(); location.reload(); }
    if (act === 'admin') { try { await signInGoogle(); location.reload(); } catch {} }
    if (act === 'move') {
      b.disabled = true; b.textContent = 'מעביר…';
      try { await err.move(); location.reload(); }
      catch { b.textContent = 'ההעברה נכשלה, נסה שוב'; b.disabled = false; }
    }
  };
}

// ---- טיפ לאייפון: הוספה למסך הבית (מונע מחיקה של Safari אחרי 7 ימים בלי שימוש) ----
export function iosTip() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (!ios || navigator.standalone) return;
  try { if (localStorage.getItem('herbs2:tip')) return; } catch {}
  const share = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
  const el = document.createElement('div');
  el.className = 'ios-tip';
  el.innerHTML = `<b>כדאי להוסיף למסך הבית</b><span>לחצו על ${share} שיתוף ← "הוסף למסך הבית", ומעכשיו פתחו את האפליקציה משם.</span><button aria-label="סגירה">✕</button>`;
  el.querySelector('button').onclick = () => { el.remove(); try { localStorage.setItem('herbs2:tip', '1'); } catch {} };
  document.body.append(el);
}
