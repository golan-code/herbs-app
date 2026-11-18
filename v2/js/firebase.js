// חיבור ל-Firebase (פרויקט golan-herbs-app). משותף לאפליקציה ולדף הניהול.
// הערכים כאן ציבוריים מטבעם; ההגנה על הדאטה היא בכללי האבטחה (firestore.rules).
// במחשב (localhost) מתחברים לאמולטורים המקומיים, אלא אם מוסיפים לכתובת ?prod
const V = '11.0.2';
const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
export const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
export const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

const app = initializeApp({
  apiKey: 'AIzaSyCHKNgfQVqlOMpla5lNV_YwIQ-OZm927lw',
  authDomain: 'golan-herbs-app.firebaseapp.com',
  projectId: 'golan-herbs-app',
  storageBucket: 'golan-herbs-app.firebasestorage.app',
  messagingSenderId: '94834754853',
  appId: '1:94834754853:web:90cb0b2d51c5f7b34586cc',
});

export const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]prod\b/.test(location.search);

export const auth = A.getAuth(app);
// מטמון מקומי: התוכן נשמר בטלפון אחרי הטעינה הראשונה, כדי שיעבוד גם בלי אינטרנט
export const db = F.initializeFirestore(app, {
  localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }),
});
if (local) {
  A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export const ready = () => auth.authStateReady().then(() => auth.currentUser);
export const isGoogle = u => !!u && u.providerData.some(p => p.providerId === 'google.com');

export const signInGoogle = () => A.signInWithPopup(auth, new A.GoogleAuthProvider());
export const signOut = () => A.signOut(auth);

// התוכן המקצועי: content/meta + content/herbs-0..n (JSON מחולק לחלקים)
export async function loadContent() {
  const snap = await F.getDocs(F.collection(db, 'content'));
  const n = snap.docs.find(d => d.id === 'meta')?.data().parts || 0;
  const parts = snap.docs.filter(d => /^herbs-\d+$/.test(d.id) && +d.id.slice(6) < n)
    .sort((a, b) => +a.id.slice(6) - +b.id.slice(6));
  if (!n || parts.length !== n) throw Object.assign(new Error('no content'), { code: 'no-content' });
  return JSON.parse(parts.map(d => d.data().json).join(''));
}
