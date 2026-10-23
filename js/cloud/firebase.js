// Loads the Firebase SDK from Google's CDN only when Firebase is configured,
// so the "this device only" mode stays light. Pinned to an exact version.

import { firebaseConfig, emulators } from '../firebase-config.js';

export const SDK_VERSION = '12.19.0';
const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

export function isConfigured() {
  const c = firebaseConfig;
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}

let loading = null;

/** Returns { app, auth, db, a (auth functions), fs (Firestore functions) }. */
export function loadFirebase() {
  if (!loading) loading = init();
  return loading;
}

async function init() {
  const [appMod, a, fs] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);

  const auth = a.initializeAuth(app, {
    persistence: [a.indexedDBLocalPersistence, a.browserLocalPersistence],
    popupRedirectResolver: a.browserPopupRedirectResolver,
  });
  auth.languageCode = 'en';

  // Keep a local copy so the app opens fast and works with a weak signal at the
  // pump. Falls back to memory-only where the browser blocks storage.
  let db;
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.initializeFirestore(app, { localCache: fs.memoryLocalCache() });
  }

  if (emulators?.auth) {
    a.connectAuthEmulator(auth, emulators.auth, { disableWarnings: true });
    auth.settings.appVerificationDisabledForTesting = true; // emulator only: skip real reCAPTCHA
  }
  if (emulators?.firestore) fs.connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);

  return { app, auth, db, a, fs };
}
