// בדיקות כללי האבטחה מול אמולטור Firestore: npm run test:rules
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

const ADMIN = { email: 'golangabrielf@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-herbs',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());

const inFuture = (ms = 864e5) => Timestamp.fromMillis(Date.now() + ms);
const invite = (extra = {}) => ({ name: 'דנה', days: 14, createdAt: Timestamp.now(), expiresAt: inFuture(), locked: false, deviceUid: null, claimedAt: null, lastSeen: null, moves: 0, ...extra });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'content/herbs-0'), { json: '[]' });
    await setDoc(doc(db, 'invites/FREE1'), invite());
    await setDoc(doc(db, 'invites/LOCKED'), invite({ locked: true }));
    await setDoc(doc(db, 'invites/OLD'), invite({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
    // קוד שנתפס לפני שעה במכשיר dev1
    await setDoc(doc(db, 'invites/TAKEN'), invite({ deviceUid: 'dev1', claimedAt: Timestamp.fromMillis(Date.now() - 36e5) }));
    await setDoc(doc(db, 'devices/dev1'), { code: 'TAKEN', at: Timestamp.now() });
    // קוד שנתפס לפני דקה במכשיר dev2 (עדיין בחלון המעבר)
    await setDoc(doc(db, 'invites/FRESH'), invite({ deviceUid: 'dev2', claimedAt: Timestamp.fromMillis(Date.now() - 6e4) }));
    // קוד שכבר הועבר 3 פעמים
    await setDoc(doc(db, 'invites/MAXED'), invite({ deviceUid: 'dev3', claimedAt: Timestamp.fromMillis(Date.now() - 36e5), moves: 3 }));
    await setDoc(doc(db, 'devices/dev3'), { code: 'MAXED', at: Timestamp.now() });
  });
});

const anon = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
// kind: 'fresh' (קוד פנוי), 'free' (מעבר בתוך החלון), או מספר = ערך moves החדש (מעבר נספר)
const claim = (db, uid, code, kind = 'fresh') => {
  const b = writeBatch(db);
  b.update(doc(db, 'invites', code),
    kind === 'fresh' ? { deviceUid: uid, claimedAt: serverTimestamp(), lastSeen: serverTimestamp() }
    : kind === 'free' ? { deviceUid: uid, lastSeen: serverTimestamp() }
    : { deviceUid: uid, lastSeen: serverTimestamp(), moves: kind });
  b.set(doc(db, 'devices', uid), { code, at: serverTimestamp() });
  return b.commit();
};

test('בלי התחברות אי אפשר לקרוא תוכן', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'content/herbs-0')));
});

test('משתמש אנונימי בלי קוד לא קורא תוכן', async () => {
  await assertFails(getDoc(doc(anon('x'), 'content/herbs-0')));
  await assertFails(getDocs(collection(anon('x'), 'content')));
});

test('תפיסת קוד פנוי ואז קריאת תוכן', async () => {
  const db = anon('u1');
  await assertSucceeds(claim(db, 'u1', 'FREE1'));
  await assertSucceeds(getDocs(collection(db, 'content')));
});

test('מכשיר שני: אחרי החלון, מעבר רק אם נספר (moves+1), והמכשיר הקודם מאבד גישה', async () => {
  const db = anon('other');
  await assertSucceeds(getDoc(doc(db, 'invites/TAKEN')));           // רואה את המצב כדי להציע העברה
  await assertFails(getDocs(collection(db, 'content')));
  await assertFails(claim(db, 'other', 'TAKEN', 'fresh'));
  await assertFails(claim(db, 'other', 'TAKEN', 'free'));            // מחוץ לחלון החינם
  await assertFails(claim(db, 'other', 'TAKEN', 5));                 // קפיצה במונה
  await assertSucceeds(claim(db, 'other', 'TAKEN', 1));
  await assertSucceeds(getDocs(collection(db, 'content')));
  await assertFails(getDocs(collection(anon('dev1'), 'content')));   // הקודם בחוץ
});

test('אחרי 3 מעברים: אין עוד מעבר', async () => {
  await assertFails(claim(anon('n'), 'n', 'MAXED', 4));
  await assertFails(claim(anon('n'), 'n', 'MAXED', 'free'));
  await assertSucceeds(getDocs(collection(anon('dev3'), 'content'))); // המכשיר הנוכחי ממשיך לעבוד
});

test('בתוך 30 הדקות הראשונות: מעבר חינם, בלי לגעת במונה', async () => {
  await assertFails(claim(anon('dev2b'), 'dev2b', 'FRESH', 1));
  await assertSucceeds(claim(anon('dev2b'), 'dev2b', 'FRESH', 'free'));
  await assertSucceeds(getDocs(collection(anon('dev2b'), 'content')));
});

test('המכשיר הנכון קורא, ומעדכן כניסה אחרונה בלבד', async () => {
  const db = anon('dev1');
  await assertSucceeds(getDocs(collection(db, 'content')));
  await assertSucceeds(updateDoc(doc(db, 'invites/TAKEN'), { lastSeen: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, 'invites/TAKEN'), { expiresAt: inFuture(1e10) }));
  await assertFails(updateDoc(doc(db, 'invites/TAKEN'), { moves: 0 }));
  await assertFails(updateDoc(doc(db, 'invites/TAKEN'), { locked: false, lastSeen: serverTimestamp() , name: 'x' }));
});

test('קוד נעול או פג תוקף: אי אפשר לתפוס ואין קריאה', async () => {
  await assertFails(claim(anon('a'), 'a', 'LOCKED'));
  await assertFails(claim(anon('b'), 'b', 'OLD'));
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'invites/FRESH'), { locked: true }));
  await assertFails(claim(anon('c'), 'c', 'FRESH', 'free'));
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'invites/TAKEN'), { locked: true }));
  await assertFails(getDocs(collection(anon('dev1'), 'content')));
  await assertSucceeds(getDoc(doc(anon('dev1'), 'invites/TAKEN'))); // כדי להציג "תקופת הניסיון הסתיימה"
});

test('קוד שפג תוקפו אחרי התפיסה חוסם קריאה', async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'invites/TAKEN'), { expiresAt: Timestamp.fromMillis(Date.now() - 1) }));
  await assertFails(getDocs(collection(anon('dev1'), 'content')));
});

test('משתמש לא יכול לכתוב תוכן, ליצור קוד או לראות רשימת קודים', async () => {
  const db = anon('dev1');
  await assertFails(setDoc(doc(db, 'content/herbs-0'), { json: 'x' }));
  await assertFails(setDoc(doc(db, 'invites/MINE'), invite()));
  await assertFails(getDocs(collection(db, 'invites')));
  await assertFails(deleteDoc(doc(db, 'invites/TAKEN')));
});

test('אי אפשר להצביע את המכשיר על קוד של מישהו אחר', async () => {
  await assertFails(setDoc(doc(anon('evil'), 'devices/evil'), { code: 'TAKEN', at: serverTimestamp() }));
});

test('אדמין: קורא, כותב ומנהל קודים', async () => {
  const db = env.authenticatedContext('admin', ADMIN).firestore();
  await assertSucceeds(getDocs(collection(db, 'content')));
  await assertSucceeds(setDoc(doc(db, 'content/herbs-0'), { json: '[1]' }));
  await assertSucceeds(getDocs(collection(db, 'invites')));
  await assertSucceeds(setDoc(doc(db, 'invites/NEW'), invite()));
  await assertSucceeds(updateDoc(doc(db, 'invites/TAKEN'), { locked: true, deviceUid: null, moves: 0 }));
  await assertSucceeds(deleteDoc(doc(db, 'invites/NEW')));
});

test('מייל אחר עם Google, או המייל שלי בלי Google, אינם אדמין', async () => {
  const other = env.authenticatedContext('o', { ...ADMIN, email: 'someone@gmail.com' }).firestore();
  await assertFails(getDocs(collection(other, 'content')));
  const pw = env.authenticatedContext('p', { ...ADMIN, firebase: { sign_in_provider: 'password' } }).firestore();
  await assertFails(getDocs(collection(pw, 'invites')));
  const unverified = env.authenticatedContext('q', { ...ADMIN, email_verified: false }).firestore();
  await assertFails(setDoc(doc(unverified, 'content/x'), { json: '' }));
});
