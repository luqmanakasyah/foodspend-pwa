// Lighter facade to defer loading heavy firebase modules until needed.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';

// Core config (same as main firebase.ts)
const firebaseConfig = {
  apiKey: 'AIzaSyCV6h_tsD2MyJnanSpQyxUNNmATvgpYt_g',
  authDomain: 'spendtrack-x.firebaseapp.com',
  projectId: 'spendtrack-x',
  storageBucket: 'spendtrack-x.appspot.com',
  messagingSenderId: '885955657073',
  appId: '1:885955657073:web:5c5a5cb55273f5fe074ad0',
  measurementId: 'G-V2H4K1CGCY'
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _fsSettings: any = null;

function computeFsSettings() {
  if (_fsSettings) return _fsSettings;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as any)?.maxTouchPoints > 1);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);
  const search = typeof window !== 'undefined' ? window.location.search : '';
  // Query param or localStorage flag OR localhost triggers forced long polling
  const forceLP = /[?&](fsforce=1|fslp=1)/.test(search)
    || (typeof localStorage !== 'undefined' && localStorage.getItem('fs_force_lp') === '1')
    || (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  _fsSettings = forceLP
    ? { experimentalForceLongPolling: true, useFetchStreams: false }
    : { experimentalAutoDetectLongPolling: isIOS || isSafari };
  if (typeof console !== 'undefined') console.info('[fs] settings', _fsSettings, { forceLP });
  return _fsSettings;
}

export function getAppInstance(): FirebaseApp {
  if (_app) return _app;
  _app = getApps()[0] || initializeApp(firebaseConfig);
  return _app;
}

// Lazy auth accessor
export async function getAuthModule() {
  const app = getAppInstance();
  const mod = await import('firebase/auth');
  const auth = mod.getAuth(app);
  return { ...mod, auth } as const;
}

// Lazy firestore accessor with iOS/Safari heuristics preserved (subset)
export async function getFirestoreModule() {
  const app = getAppInstance();
  const mod = await import('firebase/firestore');
  if (!_db) {
    const settings = computeFsSettings();
    // initializeFirestore provides consistent behavior with explicit settings.
    if ('initializeFirestore' in mod) {
      _db = (mod as any).initializeFirestore(app, settings);
    } else {
      _db = (mod as any).getFirestore(app, settings);
    }
  }
  return { ...mod, db: _db! } as const;
}

// Helper to force long polling for next load (debug toggle)
export function forceLongPolling(enable: boolean) {
  if (typeof localStorage !== 'undefined') {
    if (enable) localStorage.setItem('fs_force_lp', '1'); else localStorage.removeItem('fs_force_lp');
  }
  if (typeof window !== 'undefined') window.location.reload();
}
