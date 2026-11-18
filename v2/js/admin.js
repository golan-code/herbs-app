// דף הניהול: כניסה עם Google (רק המייל של המנהל, נאכף בכללי האבטחה), יצירת קודים וניהולם, העלאת הנתונים.
import { auth, db, F, ready, isGoogle, signInGoogle, signOut } from './firebase.js';
import { MAX_MOVES } from './access.js';

const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BASE = new URL('./', location.href).href;
const linkFor = code => BASE + '?invite=' + encodeURIComponent(code);
const waFor = (name, code) => 'https://wa.me/?text=' + encodeURIComponent(
  `שלום ${name}, זה הקישור האישי שלך לאפליקציית צמחי המרפא:\n${linkFor(code)}\n\n` +
  `הקישור עובד בכל פעם במכשיר אחד.\n` +
  `באייפון: פתחו את הקישור, לחצו על כפתור השיתוף ← "הוסף למסך הבית", ומעכשיו היכנסו מהאייקון.`);
const UNIT = { d: 864e5, h: 36e5, m: 6e4 };
const fmt = ts => ts ? new Date(ts.toMillis()).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

function newCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(10));
  return [...r].map(x => abc[x % abc.length]).join('');
}

function status(d) {
  if (d.locked) return ['lock', 'נעול'];
  if (!d.expiresAt || d.expiresAt.toMillis() <= Date.now()) return ['exp', 'פג תוקף'];
  if (!d.deviceUid) return ['wait', 'ממתין לכניסה'];
  return ['ok', 'פעיל'];
}

async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); const t = btn.textContent; btn.textContent = 'הועתק ✓'; setTimeout(() => btn.textContent = t, 1500); }
  catch { prompt('העתק את הקישור:', text); }
}

// ---------- מסך כניסה ----------
function loginScreen(note = '') {
  app.innerHTML = `<div class="center">
    <h1 style="font:700 26px var(--serif);color:var(--green)">ניהול גישה</h1>
    <p>הכניסה לדף הזה רק לחשבון Google של המנהל.</p>
    ${note ? `<p class="err">${esc(note)}</p>` : ''}
    <button class="b" id="in">כניסה עם Google</button>
    ${note ? '<p><button class="b alt sm" id="out">יציאה מהחשבון</button></p>' : ''}
  </div>`;
  $('#in').onclick = async () => { try { await signInGoogle(); start(); } catch (e) { if (e.code !== 'auth/popup-closed-by-user') loginScreen('הכניסה נכשלה: ' + e.code); } };
  $('#out') && ($('#out').onclick = async () => { await signOut(); loginScreen(); });
}

// ---------- מסך ניהול ----------
let invites = [], filter = 'all', unsub = null;

function shell(user) {
  app.innerHTML = `
  <header><h1>ניהול גישה</h1><div class="who">${esc(user.email)}<br><a href="#" id="out" style="color:var(--mute)">יציאה</a> · <a href="./" style="color:var(--mute)">לאפליקציה</a></div></header>

  <section class="card"><h2>קוד חדש</h2>
    <form id="new" class="row" autocomplete="off">
      <div class="grow"><label for="nm">שם</label><input id="nm" required maxlength="80" placeholder="למשל: דנה כהן"></div>
      <div><label for="num">תוקף</label><input id="num" type="number" min="1" max="3650" value="14" required inputmode="numeric"></div>
      <div><label for="unit">יחידה</label><select id="unit"><option value="d">ימים</option><option value="h">שעות</option><option value="m">דקות</option></select></div>
      <button class="b" id="mk">יצירת קישור</button>
    </form>
    <div class="out" id="res"><b id="rname"></b><code id="lnk"></code><div class="row">
      <a class="b wa" id="wa" target="_blank" rel="noopener">שליחה בוואטסאפ</a><button class="b alt" id="cp">העתקת קישור</button></div></div>
  </section>

  <section class="card"><h2>קודים</h2>
    <div class="filters" id="flt">${[['all', 'הכל'], ['ok', 'פעיל'], ['wait', 'ממתין'], ['lock', 'נעול'], ['exp', 'פג תוקף']].map(([k, t]) => `<button data-f="${k}" class="${k === filter ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="list" id="list"><p class="msg">טוען…</p></div>
  </section>

  <section class="card"><h2>נתוני הצמחים</h2>
    <p class="msg" id="dstat">בודק…</p>
    <div class="row" style="margin-top:10px"><div class="grow"><label for="file">העלאת קובץ herbs-data.json (מחליף את הנתונים הקיימים)</label><input type="file" id="file" accept=".json,application/json"></div>
    <button class="b alt" id="up" disabled>העלאה</button></div>
    <p class="msg" id="umsg"></p>
  </section>`;

  $('#out').onclick = async e => { e.preventDefault(); unsub?.(); await signOut(); loginScreen(); };
  $('#new').onsubmit = createInvite;
  // מתחילים קוד חדש: מסתירים את הקישור הקודם, כדי שלא יישלח בטעות לאדם הבא
  $('#nm').oninput = () => { $('#res').style.display = 'none'; };
  $('#flt').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; $('#flt').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawList(); };
  $('#list').onclick = onAction;
  $('#file').onchange = () => { $('#up').disabled = !$('#file').files.length; };
  $('#up').onclick = upload;
}

async function createInvite(e) {
  e.preventDefault();
  const name = $('#nm').value.trim(), num = +$('#num').value, unit = $('#unit').value;
  if (!name || !(num > 0)) return;
  $('#mk').disabled = true;
  try {
    const code = newCode();
    await F.setDoc(F.doc(db, 'invites', code), {
      name, days: unit === 'd' ? num : +(num * UNIT[unit] / UNIT.d).toFixed(4),
      createdAt: F.serverTimestamp(), expiresAt: F.Timestamp.fromMillis(Date.now() + num * UNIT[unit]),
      locked: false, deviceUid: null, claimedAt: null, lastSeen: null, moves: 0,
    });
    $('#rname').textContent = 'הקישור של ' + name;
    $('#lnk').textContent = linkFor(code);
    $('#wa').href = waFor(name, code);
    $('#cp').onclick = () => copy(linkFor(code), $('#cp'));
    $('#res').style.display = 'block';
    $('#nm').value = '';
  } catch (err) { alert('היצירה נכשלה: ' + (err.code || err.message)); }
  $('#mk').disabled = false;
}

function drawList() {
  const rows = invites.filter(d => filter === 'all' || status(d)[0] === filter);
  if (!rows.length) { $('#list').innerHTML = `<p class="msg">${invites.length ? 'אין קודים בסינון הזה.' : 'עדיין אין קודים.'}</p>`; return; }
  $('#list').innerHTML = rows.map(d => {
    const [cls, txt] = status(d);
    return `<div class="inv" data-code="${esc(d.id)}">
      <div class="top"><span class="name">${esc(d.name)}</span><span class="st ${cls}">${txt}</span></div>
      <div class="meta"><span>תפוגה</span><span>${fmt(d.expiresAt)}</span><span>כניסה אחרונה</span><span>${fmt(d.lastSeen)}</span>
        <span>מכשיר</span><span>${d.deviceUid ? 'מחובר' : 'עוד לא נכנס'}</span>
        <span>מעברי מכשיר</span><span${(d.moves || 0) >= MAX_MOVES ? ' class="err"' : ''}>${d.moves || 0} מתוך ${MAX_MOVES}</span><span>קוד</span><span dir="ltr" style="text-align:right">${esc(d.id)}</span></div>
      <div class="acts">
        ${d.locked ? '<button class="b sm" data-a="unlock">שחרור</button>' : '<button class="b warn sm" data-a="lock">נעילה</button>'}
        <button class="b alt sm" data-a="extend">הארכה</button>
        <button class="b alt sm" data-a="reset"${d.deviceUid || d.moves ? '' : ' disabled'}>איפוס מכשיר</button>
        <button class="b alt sm" data-a="copy">העתקת קישור</button>
        <a class="b wa sm" href="${esc(waFor(d.name, d.id))}" target="_blank" rel="noopener">וואטסאפ</a>
        <button class="b warn sm" data-a="del">מחיקה</button>
      </div></div>`;
  }).join('');
}

async function onAction(e) {
  const btn = e.target.closest('[data-a]'); if (!btn) return;
  const code = btn.closest('[data-code]').dataset.code, d = invites.find(x => x.id === code), ref = F.doc(db, 'invites', code);
  try {
    switch (btn.dataset.a) {
      case 'lock': await F.updateDoc(ref, { locked: true }); break;
      case 'unlock': await F.updateDoc(ref, { locked: false }); break;
      case 'copy': return copy(linkFor(code), btn);
      case 'extend': {
        const v = prompt(`בכמה ימים להאריך את "${d.name}"? (ההארכה נספרת מהתפוגה הנוכחית, או מעכשיו אם כבר פג)`, '7');
        const n = parseFloat(v); if (!(n > 0)) return;
        const from = Math.max(Date.now(), d.expiresAt?.toMillis() || 0);
        await F.updateDoc(ref, { expiresAt: F.Timestamp.fromMillis(from + n * UNIT.d) }); break;
      }
      case 'reset':
        if (!confirm(`לאפס את "${d.name}"? המכשיר הבא שיפתח את הקישור יקבל את הגישה, ומונה המעברים יתאפס.`)) return;
        await F.updateDoc(ref, { deviceUid: null, claimedAt: null, moves: 0 }); break;
      case 'del': {
        // הקלדת השם מוודאת שמוחקים את הכרטיס הנכון (אחרי מחיקה הכרטיסים זזים, וקל ללחוץ על הלא נכון)
        const v = prompt(`מחיקת הקוד של "${d.name}". הקישור יפסיק לעבוד, ואי אפשר לבטל את זה.\nכדי לאשר, הקלד את השם: ${d.name}`);
        if (v == null) return;
        if (v.trim() !== d.name.trim()) { alert('השם לא תואם. לא נמחק כלום.'); return; }
        await F.deleteDoc(ref); break;
      }
    }
  } catch (err) { alert('הפעולה נכשלה: ' + (err.code || err.message)); }
}

// ---------- נתונים ----------
const CHUNK = 200000; // תווים לכל מסמך (מתחת למגבלת 1MB של Firestore)

async function dataStatus() {
  try {
    const m = await F.getDoc(F.doc(db, 'content', 'meta'));
    $('#dstat').textContent = m.exists()
      ? `ב-Firestore יש ${m.data().count} צמחים (עודכן ${fmt(m.data().updatedAt)}).`
      : 'עדיין לא הועלו נתונים. האפליקציה לא תציג צמחים עד ההעלאה.';
  } catch (e) { $('#dstat').textContent = 'לא ניתן לבדוק: ' + e.code; }
}

async function upload() {
  const f = $('#file').files[0]; if (!f) return;
  $('#umsg').textContent = 'קורא את הקובץ…'; $('#umsg').className = 'msg';
  try {
    const arr = JSON.parse(await f.text());
    if (!Array.isArray(arr) || !arr.length || !arr.every(h => h && typeof h.n === 'string' && h.lat)) throw new Error('הקובץ לא נראה כמו herbs-data.json');
    if (!confirm(`להעלות ${arr.length} צמחים ולהחליף את הנתונים הקיימים?`)) { $('#umsg').textContent = ''; return; }
    const json = JSON.stringify(arr), parts = [];
    for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
    const old = (await F.getDoc(F.doc(db, 'content', 'meta'))).data()?.parts || 0;
    const b = F.writeBatch(db);
    parts.forEach((p, i) => b.set(F.doc(db, 'content', 'herbs-' + i), { json: p }));
    for (let i = parts.length; i < old; i++) b.delete(F.doc(db, 'content', 'herbs-' + i));
    b.set(F.doc(db, 'content', 'meta'), { parts: parts.length, count: arr.length, updatedAt: F.serverTimestamp() });
    $('#umsg').textContent = 'מעלה…';
    await b.commit();
    $('#umsg').textContent = `הועלו ${arr.length} צמחים ✓`;
    $('#file').value = ''; $('#up').disabled = true;
    dataStatus();
  } catch (e) { $('#umsg').textContent = 'ההעלאה נכשלה: ' + (e.code || e.message); $('#umsg').className = 'msg err'; }
}

// ---------- התחלה ----------
async function start() {
  const user = await ready();
  if (!isGoogle(user)) return loginScreen();
  shell(user);
  unsub = F.onSnapshot(F.query(F.collection(db, 'invites'), F.orderBy('createdAt', 'desc')),
    s => { invites = s.docs.map(d => ({ id: d.id, ...d.data() })); drawList(); },
    e => { unsub?.(); loginScreen(e.code === 'permission-denied' ? `החשבון ${user.email} אינו מורשה לנהל.` : 'שגיאה: ' + e.code); });
  dataStatus();
  setInterval(drawList, 60e3); // סטטוס "פג תוקף" מתעדכן גם בלי שינוי בנתונים
}
start();
