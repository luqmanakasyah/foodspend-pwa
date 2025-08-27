import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut,
  browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, getRedirectResult
} from 'firebase/auth';
import {
  initializeFirestore, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, doc, deleteDoc, setLogLevel, getDocs,
  disableNetwork, enableNetwork, updateDoc
} from 'firebase/firestore';

// Firebase config inserted (public keys are safe to expose in client code)
const firebaseConfig = {
  apiKey: 'AIzaSyCV6h_tsD2MyJnanSpQyxUNNmATvgpYt_g',
  authDomain: 'spendtrack-x.firebaseapp.com',
  projectId: 'spendtrack-x',
  // NOTE: Typical default bucket ends with .appspot.com; adjust if needed in console
  // NOTE: storageBucket adjusted if you enable Storage; default format is <project-id>.appspot.com
  storageBucket: 'spendtrack-x.appspot.com',
  messagingSenderId: '885955657073',
  appId: '1:885955657073:web:5c5a5cb55273f5fe074ad0',
  measurementId: 'G-V2H4K1CGCY'
};

export const app = initializeApp(firebaseConfig);
// Initialize auth explicitly so we can provide a layered persistence fallback array.
export const auth = getAuth(app);
// Detect problematic Safari environments (especially iOS) that sometimes fail the WebChannel stream
// leading to repeated 400 errors; enable auto long polling fallback there.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as any)?.maxTouchPoints > 1);
const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);
const search = typeof window !== 'undefined' ? window.location.search : '';
const forceFlag = /[?&]fsforce=1/.test(search);
const disablePersistFlag = /[?&]persist=0/.test(search);
// Force long polling on iOS/Safari (400 channel issues) or if user explicitly requests.
const forceLP = forceFlag || (isIOS && isSafari);
const initSettings: any = forceLP
  ? { experimentalForceLongPolling: true, useFetchStreams: false }
  : { experimentalAutoDetectLongPolling: isIOS || isSafari };
export const db = initializeFirestore(app, initSettings);
console.info('[fs] Firestore init', { forceLP, settings: initSettings });

// Requirement: skip persistence to avoid background listeners / connections.
console.info('[fs] persistence disabled by configuration');

// Optional verbose Firestore debug if URL contains ?fsdebug=1
try {
  if (typeof window !== 'undefined' && /[?&]fsdebug=1/.test(window.location.search)) {
    setLogLevel('debug');
    console.info('[fs] debug log level enabled');
  }
} catch {}

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

// Provider factory (avoid stale instance issues in some iOS Safari environments)
export const getGoogleProvider = () => new GoogleAuthProvider();
export const providers = { get google() { return getGoogleProvider(); } } as const;
export {
  signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, doc, deleteDoc, getDocs, disableNetwork, enableNetwork, updateDoc
};
export { browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, getRedirectResult };
export { analytics };
