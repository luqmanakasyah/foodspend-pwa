import React, { useEffect, useMemo, useState } from 'react';
import {
  auth, onAuthStateChanged, signOut, db,
  collection, addDoc, serverTimestamp, Timestamp, doc, deleteDoc, getRedirectResult,
  disableNetwork, enableNetwork, getDocs, query, orderBy
} from './lib/firebase';
import type { Tx, CategoryId, PaymentMethod } from './types';
import { txConverter } from './lib/converters';

export default function App() {
  const [user, setUser] = useState<null | { uid: string; displayName: string | null }>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [view, setView] = useState<'home' | 'add'>('home');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName } : null);
    });
    return () => unsub();
  }, []);

  // Resolve redirect result early (iOS Safari occasionally delays persistence availability) and log details.
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) console.info('[auth] redirect result user restored', result.user.uid);
      } catch (e: any) {
        const code = e?.code || e?.message;
        console.warn('[auth] getRedirectResult error', code, e);
        // Ignore benign argument-error seen on iOS Safari when no pending redirect
        if (code !== 'auth/argument-error') {
          setRedirectErr(code);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadOnce = async () => {
      setLoadingTxs(true);
      try {
        await enableNetwork(db).catch(()=>{});
        const snap = await getDocs(query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')));
        if (!cancelled) { setTxs(snap.docs.map(d=>d.data() as Tx)); setTxErr(null); }
      } catch (e: any) {
        if (!cancelled) { console.error('[fs] initial load error', e); setTxErr(e?.code||e?.message||'load-error'); }
      } finally {
        if (!cancelled) setLoadingTxs(false);
        disableNetwork(db).catch(()=>{});
      }
    };
    loadOnce();
    return () => { cancelled = true; };
  }, [user]);

  const manualRefresh = async () => {
    if (!user) return;
    try {
      setLoadingTxs(true);
      await enableNetwork(db).catch(()=>{});
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')));
      const list = snap.docs.map(d=>d.data() as Tx);
      setTxs(list);
      setTxErr(null);
    } catch (e: any) {
      setTxErr(e?.code || e?.message || 'load-error');
    } finally {
      setLoadingTxs(false);
      // Return to offline (no network listeners)
      disableNetwork(db).catch(()=>{});
    }
  };

  if (!user) return <AuthScreen />;
  const handleAdded = (tx: Tx) => {
    // Optimistic append and keep list sorted by date desc
    setTxs(prev => {
      const list = [tx, ...prev];
      return list.sort((a,b)=> (b.date as any).toMillis?.() - (a.date as any).toMillis?.() || 0);
    });
    setView('home');
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <TopBar
        name={user.displayName ?? 'You'}
        onSignOut={() => signOut(auth)}
        onAdd={() => setView('add')}
        onRefresh={manualRefresh}
        refreshing={loadingTxs}
        showActions={view === 'home'}
        onHome={() => setView('home')}
        view={view}
      />
      {view === 'home' && (
        <>
          {txErr && <div style={{ ...card, background: '#fef2f2', color: '#991b1b', marginTop: 12 }}>Load error: {txErr}</div>}
          <TxList uid={user.uid} txs={txs} />
          <InstallHint />
        </>
      )}
      {view === 'add' && (
        <AddTxForm uid={user.uid} onAdded={handleAdded} onCancel={() => setView('home')} />
      )}
    </div>
  );
}

function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    try {
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
      const safari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const env = { ua, ios, safari, attempt: attempts + 1 };
      console.info('[auth] signIn start', env);
      sessionStorage.setItem('fs_auth_attempt', String(Date.now()));
      // Detect durable storage capability (redirect flow requires persistence beyond memory)
      const canUseStorage = (() => {
        try {
          const k = '__fs_test__';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return true;
        } catch {
          try {
            sessionStorage.setItem('__fs_test__', '1');
            sessionStorage.removeItem('__fs_test__');
            return true;
          } catch {
            return false;
          }
        }
      })();
      console.info('[auth] storage capability', { canUseStorage });

      // Strategy:
      // 1. Try popup if environment supports (even on iOS) because redirect without storage will fail.
      // 2. If popup not supported or blocked, only then attempt redirect IF storage available.

      // Dynamically import firebase/auth to ensure provider + methods come from same bundled copy (avoids argument-error from duplicate modules)
      const authMod = await import('firebase/auth');
      const provider = new authMod.GoogleAuthProvider();
      console.info('[auth] provider check', { providerId: provider.providerId, hasAddScope: typeof provider.addScope === 'function' });
      if (!provider || provider.providerId !== 'google.com') {
        setErr('Provider initialization failure');
        return;
      }
      let popupTried = false;
      try {
        await authMod.signInWithPopup(auth, provider);
        console.info('[auth] popup success');
        return;
      } catch (popupErr: any) {
        popupTried = true;
        const pCode = popupErr?.code || popupErr?.message;
        console.warn('[auth] popup failed', pCode, popupErr);
        if (pCode === 'auth/argument-error') {
          console.warn('[auth] argument-error details', { providerKeys: Object.keys(provider || {}), authKeys: Object.keys(auth || {}) });
        }
        if (!canUseStorage) {
          setErr('Popup blocked & no durable storage; enable cookies or open in external Safari/Chrome.');
          return;
        }
        console.info('[auth] trying redirect fallback');
        await authMod.signInWithRedirect(auth, provider);
        return;
      }
    } catch (e: any) {
      // Common silent failures: popup blocked, disallowed domain, provider disabled.
      const code = e?.code || e?.message;
      console.warn('[auth] signIn failed', e);
      let msg = code || 'Sign-in failed';
      if (code === 'auth/configuration-not-found') msg += ' (Google provider not fully configured)';
      if (code === 'auth/operation-not-allowed') msg += ' (Provider disabled)';
      if (code === 'auth/argument-error') msg += ' (Bad parameter to auth API – check provider instance)';
      setErr(msg);
    } finally {
      setLoading(false);
      setAttempts(a => a + 1);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '20vh auto', textAlign: 'center' }}>
      <h1>FoodSpend</h1>
      <p>Track your food spend anywhere. Works offline.</p>
      <button onClick={signIn} style={btn} disabled={loading}>{loading ? 'Opening…' : 'Sign in with Google'}</button>
  {(attempts > 0 && (err || redirectErr)) && (
        <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 12 }}>
          {(err || redirectErr)} – Ensure:
          <ul style={{ textAlign: 'left', margin: '4px 0 0 16px', padding: 0 }}>
            <li>Popup blocker disabled</li>
            <li>Current domain is in Firebase Auth authorized domains</li>
            <li>Google provider enabled in Firebase Console</li>
    <li>Cookies not disabled (iOS: Settings &gt; Safari &gt; Block All Cookies OFF)</li>
          </ul>
        </div>
      )}
  {/* Debug UI removed for production */}
    </div>
  );
}

function TopBar({ name, onSignOut, onAdd, onRefresh, refreshing, showActions, onHome, view }:{
  name: string; onSignOut: () => void; onAdd: () => void; onRefresh: () => void; refreshing: boolean; showActions: boolean; onHome: () => void; view: 'home' | 'add';
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {view === 'add' && <button style={btnSecondary} onClick={onHome}>← Home</button>}
        <h2 style={{ margin: 0 }}>🍲 FoodSpend</h2>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {showActions && (
          <>
            <button title="Refresh" onClick={onRefresh} style={btnSecondary} disabled={refreshing}>{refreshing ? '…' : '↻'}</button>
            <button title="Add" onClick={onAdd} style={btn}>＋</button>
          </>
        )}
        <button onClick={onSignOut} style={btnSecondary}>Sign out</button>
      </div>
    </div>
  );
}

function AddTxForm({ uid, onAdded, onCancel }: { uid: string; onAdded: (tx: Tx) => void; onCancel: () => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<CategoryId>('food');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const valid = useMemo(() => Number(amount) > 0 && Number(amount) < 100000 && !!date, [amount, date]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      setSaveErr(null);
  // Ensure network for write
  await enableNetwork(db).catch(()=>{});
  const tx: Tx = {
        amount: Number(amount),
        currency: 'SGD',
        date: Timestamp.fromDate(new Date(date)),
        categoryId,
        vendor,
        paymentMethod,
        note,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
  const ref = await addDoc(collection(db, 'users', uid, 'transactions'), tx);
      setAmount('');
      setVendor('');
      setNote('');
  // Optimistic local object (server timestamps approximated with now)
  onAdded({ ...tx, id: ref.id, createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date()) });
  // Disable network again to keep idle
  disableNetwork(db).catch(()=>{});
    } catch (e: any) {
      console.error('[tx] add failed', e?.code, e);
      setSaveErr(e?.code || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={card}>
      <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Add Transaction <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button></h3>
      <div style={grid2}>
        <label>
          Amount (SGD)
          <input type="number" step="0.01" min={0.01} max={99999} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div style={grid2}>
        <label>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CategoryId)}>
            <option value="food">Food</option>
            <option value="coffee">Coffee</option>
            <option value="groceries">Groceries</option>
            <option value="others">Others</option>
          </select>
        </label>
        <label>
          Payment
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="ewallet">eWallet</option>
          </select>
        </label>
      </div>
      <label>
        Vendor
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g., Toast Box" />
      </label>
      <label>
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
      </label>
  <button disabled={!valid || saving} style={btn}>{saving ? 'Saving…' : 'Save'}</button>
  {saveErr && <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>Error: {saveErr}</div>}
    </form>
  );
}

function TxList({ uid, txs }: { uid: string; txs: Tx[] }) {
  const total = txs.reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <div style={card}>
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span>Recent ({txs.length}) — Total ${total.toFixed(2)}</span>
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {txs.map((t) => (
          <li key={t.id} style={row}>
            <div>
              <strong>{t.vendor || t.categoryId}</strong>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {new Date(t.date?.toDate?.() ?? t.date).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>${t.amount.toFixed(2)}</span>
              {t.id && (
                <button style={btnDanger} onClick={() => deleteDoc(doc(db, 'users', uid, 'transactions', t.id!))}>✕</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstallHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setReady(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!ready) return null;
  return (
    <div style={{ ...card, border: '1px dashed #999' }}>
      <b>Install FoodSpend?</b>
      <p>Get faster access and offline support.</p>
      <button style={btn} onClick={async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice; setReady(false);
      }}>Install</button>
    </div>
  );
}

const card: React.CSSProperties = { padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const btn: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: 'white', cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { ...btn, background: '#e5e7eb', color: '#111827' };
const btnDanger: React.CSSProperties = { ...btn, background: '#ef4444' };
