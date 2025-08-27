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
  const list: Tx[] = snap.docs.map(d => ({ ...(d.data() as Omit<Tx,'id'>), id: d.id }));
  if (!cancelled) { setTxs(list); setTxErr(null); }
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
  const list: Tx[] = snap.docs.map(d => ({ ...(d.data() as Omit<Tx,'id'>), id: d.id }));
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
    <div className="app-container fade-in">
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
          {txErr && <div className="alert-error fade-in" style={{ marginTop:12 }}>Load error: {txErr}</div>}
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
  <button onClick={signIn} className="btn" disabled={loading}>{loading ? 'Opening…' : 'Sign in with Google'}</button>
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
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {view === 'add' && <button className="btn btn-secondary" onClick={onHome}>← Home</button>}
        <h2>🍲 FoodSpend</h2>
      </div>
      <div className="topbar-actions">
        {showActions && (<>
          <button className="btn btn-secondary" title="Refresh" onClick={onRefresh} disabled={refreshing}>{refreshing ? '…' : '↻'}</button>
          <button className="btn" title="Add" onClick={onAdd}>＋</button>
        </>)}
        <button className="btn btn-secondary" onClick={onSignOut}>{name.split(' ')[0]} ▾</button>
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
    <form onSubmit={onSubmit} className="card fade-in" style={{ animationDelay:'.05s' }}>
      <h3 style={{ marginTop:0, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'1.05rem' }}>Add Transaction <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button></h3>
      <div className="grid2">
        <label>
          Amount (SGD)
          <input type="number" step="0.01" min={0.01} max={99999} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
  <div className="grid2">
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
  <div style={{ display:'flex', gap:12 }}>
    <button disabled={!valid || saving} className="btn">{saving ? 'Saving…' : 'Save'}</button>
    <button type="button" className="btn btn-secondary" onClick={onCancel}>Close</button>
  </div>
  {saveErr && <div className="alert-error" style={{ marginTop:10 }}>Error: {saveErr}</div>}
    </form>
  );
}

function TxList({ uid, txs }: { uid: string; txs: Tx[] }) {
  const [pendingDel, setPendingDel] = useState<null | { id: string; label: string }>(null);
  const total = txs.reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <div className="card fade-in" style={{ animationDelay:'.02s' }}>
      <div className="tx-header"><span>Recent <span className="badge">{txs.length}</span> — Total ${total.toFixed(2)}</span></div>
      {txs.length === 0 && <div className="tx-empty">No transactions yet. Use ＋ to add your first.</div>}
      <ul className="tx-list">
        {txs.map(t => (
          <li key={t.id} className="tx-row">
            <div>
              <div style={{ fontWeight:600 }}>{t.vendor || t.categoryId}</div>
              <div className="tx-meta">{new Date(t.date?.toDate?.() ?? t.date).toLocaleDateString()} • {t.categoryId}</div>
            </div>
            <div className="inline-actions">
              <div className="tx-amt">${t.amount.toFixed(2)}</div>
              {t.id && <button className="btn btn-danger" style={{ padding:'0.55rem .75rem' }} onClick={() => setPendingDel({ id: t.id!, label: t.vendor || t.categoryId })}>✕</button>}
            </div>
          </li>
        ))}
      </ul>
      {pendingDel && (
        <div className="modal-backdrop">
          <div className="modal fade-in" role="dialog" aria-modal="true">
            <h3>Delete Transaction</h3>
            <p style={{ fontSize: '.85rem', lineHeight:1.4 }}>Are you sure you want to delete <strong>{pendingDel.label}</strong>? This action cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPendingDel(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={async () => { await deleteDoc(doc(db, 'users', uid, 'transactions', pendingDel.id)); setPendingDel(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
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
  <div className="card" style={{ border:'1px dashed var(--color-border-strong)', background:'var(--color-surface-alt)' }}>
      <b>Install FoodSpend?</b>
      <p>Get faster access and offline support.</p>
  <button className="btn" onClick={async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice; setReady(false);
      }}>Install</button>
    </div>
  );
}

// Legacy inline style constants removed in favor of CSS classes.
