import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  getFirestore, enableIndexedDbPersistence, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc
} from 'firebase/firestore';

// Firebase config inserted (public keys are safe to expose in client code)
const firebaseConfig = {
  apiKey: 'AIzaSyCV6h_tsD2MyJnanSpQyxUNNmATvgpYt_g',
  authDomain: 'spendtrack-x.firebaseapp.com',
  projectId: 'spendtrack-x',
  // NOTE: Typical default bucket ends with .appspot.com; adjust if needed in console
  storageBucket: 'spendtrack-x.firebasestorage.app',
  messagingSenderId: '885955657073',
  appId: '1:885955657073:web:5c5a5cb55273f5fe074ad0',
  measurementId: 'G-V2H4K1CGCY'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {
  console.warn('IndexedDB persistence could not be enabled (maybe multiple tabs).');
});

// Lazy analytics init (avoid SSR / unsupported environments issues)
// Optional analytics: only if analytics module installed (firebase includes it) and environment supports.
let analytics: any = null;
if (typeof window !== 'undefined') {
  // Dynamic import keeps bundle lean if tree-shaken; errors ignored silently.
  import('firebase/analytics').then(mod => {
    const isSupported = (mod as any).isSupported;
    if (typeof isSupported === 'function') {
      isSupported().then((ok: boolean) => {
        if (ok) analytics = (mod as any).getAnalytics(app);
      }).catch(() => {});
    }
  }).catch(() => {});
}

export const providers = { google: new GoogleAuthProvider() };
export {
  signInWithPopup, onAuthStateChanged, signOut, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc
};
export { analytics };
