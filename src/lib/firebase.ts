import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from 'firebase/auth';
import {
  getFirestore, enableIndexedDbPersistence, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc
} from 'firebase/firestore';

// TODO: replace with your config from Firebase Console → Project settings → Web app
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {
  console.warn('IndexedDB persistence could not be enabled (maybe multiple tabs).');
});

export const providers = { google: new GoogleAuthProvider() };
export {
  signInWithPopup, onAuthStateChanged, signOut, serverTimestamp, Timestamp,
  collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc
};
