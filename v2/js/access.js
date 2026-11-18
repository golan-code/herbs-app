// גישה לאפליקציה: קוד הזמנה אישי (?invite=CODE) שננעל למכשיר הראשון, או כניסת מנהל עם Google (רק דרך admin.html; אין כפתור כניסת מנהל במסכי החסימה).
// ההגנה האמיתית בכללי האבטחה (firestore.rules); כאן רק הזרימה והמסכים.
import { auth, db, A, F, ready, isGoogle, signOut, loadContent } from './firebase.js';

// דרך ליצור קשר שמופיעה במסכי החסימה. whatsapp: מספר בפורמט בינלאומי בלי + (למשל 972501234567)
export const CONTACT = { whatsapp: '972523321490', email: '' };
export const MAX_MOVES = 3;      // חייב להתאים ל-firestore.rules
const FREE_MS = 30 * 60e3;      // חלון המעבר החינם, גם הוא כמו בכללים

const KEY = 'herbs2:invite';
const store = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: v => { try { localStorage.setItem(KEY, v); } catch {} },
  clear: () => { try { localStorage.removeItem(KEY); } catch {} },
};

// מועד סיום הניסיון של המשתמש הנוכחי (null למנהל), להצגה במסך הבית
export const trial = { ends: null };

const blocked = (kind, info = {}) => Object.assign(new Error(kind), { blocked: kind, ...info });

// אייפון/אייפד ב-Safari (לא מתוך האייקון במסך הבית)
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const IOS_SAFARI = IOS && !navigator.standalone;

// הקוד מהקישור, או השמור בטלפון. נשמר בטלפון רק אחרי שמתברר שזה לא המנהל (ראו gate)
function codeFromUrl() {
  return (new URL(location.href).searchParams.get('invite') || '').trim() || store.get();
}
// הכתובת בשורת הכתובת: עם הקוד או בלעדיו
function setUrlCode(code) {
  const u = new URL(location.href);
  if (code) u.searchParams.set('invite', code); else u.searchParams.delete('invite');
  if (u.href !== location.href) history.replaceState(null, '', u.pathname + u.search + u.hash);
}

// באייפון, האפליקציה שמותקנת ממסך הבית מקבלת אחסון נפרד מ-Safari, ולכן צריכה לקבל את הקוד בכתובת.
// "הוסף למסך הבית" שומר את כתובת הדף, אבל רק אם אין מניפסט (המניפסט קובע כתובת קבועה בלי קוד).
// לכן index.html לא טוען מניפסט באייפון בכלל (הסרה אחרי הטעינה לא מספיקה), וכאן משאירים את הקוד בכתובת.
// המעבר מ-Safari לאפליקציה המותקנת חינם ב-30 הדקות הראשונות.
function iosKeepCode(code) {
  document.querySelector('link[rel=manifest]')?.remove();
  setUrlCode(code);
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
    // מנהל שפותח קישור של מישהו: לא שומרים את הקוד, כדי שלא ייתפס אם המנהל יתנתק בדפדפן הזה
    store.clear(); setUrlCode(null);
    try { return await loadContent(); }
    catch (e) { if (e.code === 'permission-denied') throw blocked('notadmin'); throw e; }
  }
  if (!code) throw blocked('nocode');
  store.set(code);
  if (IOS_SAFARI) iosKeepCode(code); else setUrlCode(null);
  if (!user) user = (await A.signInAnonymously(auth)).user;

  const ref = F.doc(db, 'invites', code);
  const snap = await F.getDoc(ref);
  if (!snap.exists()) throw blocked('invalid');
  const d = snap.data(), name = d.name;
  if (ended(d)) throw blocked('ended', { who: name });

  if (!d.deviceUid) await take(user.uid, code, 'fresh');
  else if (d.deviceUid !== user.uid) {
    if (inFree(d)) await take(user.uid, code, 'free');
    else {
      const left = MAX_MOVES - (d.moves || 0);
      // מעבר נספר רק בלחיצה, כדי שפתיחה מקרית במכשיר ישן לא "תשרוף" מעבר
      throw blocked(left > 0 ? 'moved' : 'limit', { who: name, left, move: () => take(user.uid, code, 'count', d.moves || 0) });
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
    throw blocked(s2?.exists() && ended(s2.data()) ? 'ended' : 'invalid', { who: name });
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
  const msg = ['שלום, לגבי אפליקציית צמחי המרפא', err.who && `(${err.who})`, ask && `- ${ask}`].filter(Boolean).join(' ');
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
  </div>`;
  view.onclick = async e => {
    const b = e.target.closest('[data-act]'), act = b?.dataset.act;
    if (act === 'retry') location.reload();
    if (act === 'out') { await signOut(); location.reload(); }
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
