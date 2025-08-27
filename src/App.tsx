import React, { useEffect, useState, Suspense } from 'react';
import { auth, onAuthStateChanged, signOut, db, collection, addDoc, serverTimestamp, Timestamp, disableNetwork, enableNetwork, getDocs, query, orderBy, getRedirectResult } from './lib/firebase';
import type { Tx } from './types';
import { TopBar } from './components/TopBar';
import { AuthScreen } from './components/AuthScreen';
import { AddTxForm } from './components/AddTxForm';
import { EditTxForm } from './components/EditTxForm';
const HomeView = React.lazy(() => import('./HomeView'));

export default function App() {
  const [user, setUser] = useState<null | { uid: string; displayName: string | null }>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [view, setView] = useState<'home' | 'add' | 'edit'>('home');
  const [editingTx, setEditingTx] = useState<Tx | null>(null);

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
  onHome={() => { setView('home'); setEditingTx(null); }}
        view={view}
      />
      {view === 'home' && (
        <Suspense fallback={<div className="card" style={{ padding:20 }}>Loading…</div>}>
          <HomeView
            uid={user.uid}
            txs={txs}
            onDeleted={(id) => setTxs(prev => prev.filter(t => t.id !== id))}
            onSelect={(tx) => { setEditingTx(tx); setView('edit'); }}
          />
          {txErr && <div className="alert-error fade-in" style={{ marginTop:12 }}>Load error: {txErr}</div>}
        </Suspense>
      )}
      {view === 'add' && (
        <AddTxForm uid={user.uid} onAdded={handleAdded} onCancel={() => setView('home')} />
      )}
      {view === 'edit' && editingTx && (
        <EditTxForm
          uid={user.uid}
          tx={editingTx}
          onCancel={() => { setEditingTx(null); setView('home'); }}
          onSaved={(updated) => {
            setTxs(prev => prev.map(t => t.id === updated.id ? updated : t));
            setEditingTx(null);
            setView('home');
          }}
        />
      )}
    </div>
  );
}

// Inline subcomponents moved to /components for modularity.

// Legacy inline style constants removed in favor of CSS classes.
