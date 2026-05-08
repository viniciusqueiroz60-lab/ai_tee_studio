import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";

let _auth: Auth | null = null;
let _initPromise: Promise<Auth> | null = null;

export async function initFirebase(): Promise<Auth> {
  if (_auth) return _auth;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/config/firebase`);
    if (!res.ok) throw new Error("Failed to load Firebase config");
    const config = await res.json();

    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }

    _auth = getAuth(app);
    return _auth;
  })();

  return _initPromise;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) throw new Error("Firebase not initialized yet — call initFirebase() first");
  return _auth;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle() {
  const auth = await initFirebase();
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = await initFirebase();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = await initFirebase();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  const auth = await initFirebase();
  return signOut(auth);
}

export function onAuth(callback: (user: User | null) => void) {
  let unsubscribe: (() => void) | null = null;
  initFirebase().then((auth) => {
    unsubscribe = onAuthStateChanged(auth, callback);
  });
  return () => { unsubscribe?.(); };
}

export async function getIdToken(): Promise<string | null> {
  const auth = await initFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export type { User };
