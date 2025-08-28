import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, CategoryId, PaymentMethod } from '../types';
import { getFirestoreModule } from './firebase-lite';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SettingsState {
  categories: CategoryId[];
  paymentMethods: PaymentMethod[];
  theme: ThemeMode;
  setCategories: (next: CategoryId[]) => void;
  setPaymentMethods: (next: PaymentMethod[]) => void;
  setTheme: (mode: ThemeMode) => void;
  reset: () => void;
}

const SettingsCtx = createContext<SettingsState | null>(null);
const LS_KEY = 'fs_user_settings_v1';

interface PersistedShape { categories: string[]; paymentMethods: string[]; theme?: ThemeMode; }

function loadPersisted(): PersistedShape | null {
  try { const raw = localStorage.getItem(LS_KEY); if(!raw) return null; return JSON.parse(raw); } catch { return null; }
}

function persist(data: PersistedShape) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export const SettingsProvider: React.FC<{ children: React.ReactNode; uid?: string | null }> = ({ children, uid }) => {
  const persisted = typeof window !== 'undefined' ? loadPersisted() : null;
  const [categories, setCategoriesState] = useState<CategoryId[]>(() => persisted?.categories || DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethodsState] = useState<PaymentMethod[]>(() => persisted?.paymentMethods || DEFAULT_PAYMENT_METHODS);
  const [theme, setThemeState] = useState<ThemeMode>(() => persisted?.theme || 'system');

  const dirtyRef = useRef(false);
  const saveTimer = useRef<any>(null);
  const lastWriteRef = useRef<number | null>(null);

  const scheduleSave = useCallback((nextCats: CategoryId[], nextPms: PaymentMethod[], nextTheme: ThemeMode) => {
  if (!uid) return; // only sync when user is available
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      try {
        const { db, doc: fsDoc, setDoc, serverTimestamp } = await (await getFirestoreModule());
        // Ensure root user doc exists (merging keeps any profile fields intact)
        try {
          await setDoc(fsDoc(db, 'users', uid), { _touchedAt: serverTimestamp() }, { merge: true });
        } catch (e) {
          if (typeof console !== 'undefined') console.warn('[settings] unable to upsert user root doc', e);
        }
        const ts = Date.now();
        const ref = fsDoc(db, 'users', uid, 'meta', 'settings');
        if (typeof console !== 'undefined') console.info('[settings] writing remote settings', { path: ref.path, ts, uid });
        await setDoc(ref, { categories: nextCats, paymentMethods: nextPms, theme: nextTheme, updatedAt: ts }, { merge: true });
        lastWriteRef.current = ts;
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[settings] save error', err);
      }
    }, 600);
  }, [uid]);

  const setCategories = useCallback((next: CategoryId[]) => {
    setCategoriesState(next);
    persist({ categories: next, paymentMethods, theme });
    scheduleSave(next, paymentMethods, theme);
  }, [paymentMethods, scheduleSave, theme]);

  const setPaymentMethods = useCallback((next: PaymentMethod[]) => {
    setPaymentMethodsState(next);
    persist({ categories, paymentMethods: next, theme });
    scheduleSave(categories, next, theme);
  }, [categories, scheduleSave, theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    persist({ categories, paymentMethods, theme: mode });
    scheduleSave(categories, paymentMethods, mode);
  }, [categories, paymentMethods, scheduleSave]);

  const reset = useCallback(() => {
    setCategoriesState(DEFAULT_CATEGORIES);
    setPaymentMethodsState(DEFAULT_PAYMENT_METHODS);
    setThemeState('system');
    persist({ categories: DEFAULT_CATEGORIES, paymentMethods: DEFAULT_PAYMENT_METHODS, theme: 'system' });
    scheduleSave(DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, 'system');
  }, [scheduleSave]);

  // Real-time remote load & sync
  useEffect(() => {
    if (!uid) return;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { db, doc: fsDoc, onSnapshot, setDoc, serverTimestamp } = await (await getFirestoreModule());
        const ref = fsDoc(db, 'users', uid, 'meta', 'settings');
        const appInfo = (db as any)._app?.options || {};
        if (typeof console !== 'undefined') console.info('[settings] subscribing to remote settings', { path: (ref as any).path, uid, project: appInfo.projectId });
        unsub = onSnapshot(ref as any, async (snap: any) => {
          if (!snap.exists()) {
            // Initialize remote with current local defaults if missing
            try { await setDoc(fsDoc(db, 'users', uid), { _touchedAt: serverTimestamp() }, { merge: true }); } catch {}
            scheduleSave(categories, paymentMethods, theme);
            return;
          }
          const data = snap.data() as PersistedShape & { updatedAt?: number };
          const remoteTs = data.updatedAt || 0;
          if (lastWriteRef.current && remoteTs && remoteTs <= lastWriteRef.current) return; // ignore echo of our own write
          let nextCats = data.categories || [];
          let nextPms = data.paymentMethods || [];
          const nextTheme: ThemeMode = data.theme || 'system';
          if (!nextCats.length) nextCats = DEFAULT_CATEGORIES;
          if (!nextPms.length) nextPms = DEFAULT_PAYMENT_METHODS;
          setCategoriesState(nextCats);
          setPaymentMethodsState(nextPms);
          setThemeState(nextTheme);
          persist({ categories: nextCats, paymentMethods: nextPms, theme: nextTheme });
        }, (err: any) => {
          if (typeof console !== 'undefined') console.error('[settings] onSnapshot error', err, { uid });
        });
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[settings] subscribe setup error', err, { uid });
      }
    })();
    return () => { if (unsub) unsub(); };
  // Only re-run if uid changes (avoid duplicate subscriptions when local state updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Apply theme to document root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-light','theme-dark');
    if (theme === 'light') root.classList.add('theme-light');
    else if (theme === 'dark') root.classList.add('theme-dark');
  }, [theme]);

  return (
    <SettingsCtx.Provider value={{ categories, paymentMethods, theme, setCategories, setPaymentMethods, setTheme, reset }}>
      {children}
    </SettingsCtx.Provider>
  );
};

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
