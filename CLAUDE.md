# CLAUDE.md — אפליקציית צמחי מרפא (herbs-app)

## מה זה
אינדקס צמחי מרפא כ-PWA סטטי ב-GitHub Pages: https://golan-code.github.io/herbs-app/v2/
הכתובת הראשית מפנה ל-v2. אין build: HTML/CSS/JS רגילים (ES modules). גישת ניסיון לכ-20 משתמשים בקודי הזמנה.
המשתמש: גולן. מדבר עברית; להסביר לו בעברית, קצר וברור, בלי ז'רגון.

## חוקים קבועים
- **התוכן המקצועי (herbs-data.json) לא נכנס לריפו לעולם.** הריפו ציבורי. הנתונים ב-Firestore (`content/*`)
  ומתעדכנים רק דרך "העלאה" בדף הניהול. הקובץ חסום ב-`.gitignore`. המקור במחשב: `~/צמחי מרפא/herbs-pwa/herbs-data.json`.
- ההיסטוריה של הריפו שוכתבה (נובמבר 2026). לעבוד רק מעותק עדכני מ-GitHub, ולא לדחוף מעותק ישן.
- Firebase: רק הפרויקט `golan-herbs-app`. לא לגעת בפרויקטים האחרים בחשבון (`golan-herbal-clinic` שייך ל-clinic-app,
  `patient-chart-95c86` ל-case-tool). תוכנית Spark בלבד, בלי Cloud Functions.
- כל שינוי בקוד של v2: להעלות את `CACHE` ב-`v2/sw.js` (`herbs2-vN` → `herbs2-vN+1`), אחרת הטלפונים יציגו גרסה ישנה.
- שינוי גדול / נוגע בגישה, אבטחה או נתונים: branch נפרד → בדיקה על האמולטור → אישור של גולן → מיזוג ל-main.
  שינוי קטן (טקסט, צבע, ריווח) כשגולן כותב "שינוי קטן, תעלה ישר": מותר ישירות ל-main.
- לפני פעולה בלתי הפיכה (force push, מחיקת נתונים, פרסום Rules): לשאול.
- כל אוסף/שדה חדש ב-Firestore דורש כלל ב-`firestore.rules` ובדיקה ב-`tests/rules.test.mjs`, ופרסום הכללים לפני שהקוד עולה.

## מבנה
```
index.html, sw.js        הפניה ל-v2 + ניקוי הגרסה הישנה מטלפונים (לא לגעת)
firestore.rules          כללי האבטחה; tests/rules.test.mjs — בדיקות
v2/index.html, app.css   האפליקציה
v2/js/firebase.js        חיבור ל-Firebase (ב-localhost מתחבר לאמולטורים; ?prod = לפרויקט האמיתי)
v2/js/access.js          בדיקת גישה, מסכי חסימה, CONTACT (וואטסאפ), MAX_MOVES, טיפ לאייפון
v2/js/store.js           נתונים בזיכרון + שמירה מקומית (מועדפים, אחרונים)
v2/js/app.js             ניתוב, ROUTES ו-NAV (הסרגל התחתון)
v2/js/screens/*.js       מסך לכל קובץ
v2/admin.html, js/admin.js  דף ניהול: קודים, העלאת נתונים
v2/data/images.json      תמונות (ציבורי). lessons.json — ריק; שיעורים אישיים הם תוכן מקצועי → להעביר ל-Firestore לפני שממלאים
```

## גישה (תקציר)
- מנהל: כניסה עם Google; מזוהה בכללים לפי SHA-256 של המייל (המייל לא מופיע בקוד).
- משתמש: `?invite=CODE` → משתמש אנונימי. הקוד פעיל במכשיר אחד בכל רגע. 30 דקות ראשונות: מעבר מכשיר חינם
  (אייפון: Safari → מסך הבית). אחר כך מעבר בלחיצה, עד 3 (`moves`). "איפוס מכשיר" מאפס גם את המונה.
- שינוי 30 הדקות או 3 המעברים: גם ב-`firestore.rules` וגם ב-`v2/js/access.js`.
- אוספים: `content/{meta, herbs-N}` (JSON מחולק), `invites/{code}`, `devices/{uid}`.

## בדיקה מקומית
```
npm install                 # פעם אחת
npm run test:rules          # בדיקות כללים (צריך Java)
npm run emulators           # אמולטורים auth+firestore (פרויקט golan-herbs-app)
```
אתר מקומי: שרת סטטי על התיקייה (פורט 8000), כתובת `http://localhost:8000/v2/`.
- האמולטור מתחיל ריק: להיכנס כמנהל ב-admin.html (באמולטור אפשר `signInWithCredential` עם
  `GoogleAuthProvider.credential('{"sub":"admin-test","email":"<מייל המנהל>","email_verified":true}')`),
  להעלות עותק זמני של herbs-data.json (לשים בשם `_testdata.json` ולמחוק לפני commit!), וליצור קוד.
- "מכשיר שני" לבדיקה: `127.0.0.1:8000` לעומת `localhost:8000` (אחסון נפרד), או יציאה מהמשתמש האנונימי.
- דפדפן הבדיקה שומר קבצים במטמון: לרענן עם `fetch(url, {cache:'reload'})` או שרת עם `Cache-Control: no-store`.

## פריסה
- קוד: push ל-main → GitHub Pages מתעדכן תוך 1–2 דקות.
- כללים: `npm run deploy:rules` (לשאול לפני).
