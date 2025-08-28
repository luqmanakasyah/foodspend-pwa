import React, { useEffect, useState, Suspense } from 'react';
// Lazy firebase accessors
import { getAuthModule, getFirestoreModule } from './lib/firebase-lite';
import type { Tx } from './types';
import { TopBar } from './components/TopBar';
import { AuthScreen } from './components/AuthScreen';
import { AddTxForm } from './components/AddTxForm';
import { EditTxForm } from './components/EditTxForm';
import { SettingsProvider } from './lib/settings';
import { SettingsDrawer } from './components/SettingsDrawer';
const HomeView = React.lazy(() => import('./HomeView'));

export default function App() {
  const [user, setUser] = useState<null | { uid: string; displayName: string | null }>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [redirectErr, setRedirectErr] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [view, setView] = useState<'home' | 'add' | 'edit'>('home');
  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartDim, setChartDim] = useState<'category' | 'payment'>('category');

  useEffect(() => {
    let unsub: any;
    (async () => {
      const { auth, onAuthStateChanged } = await getAuthModule();
      unsub = onAuthStateChanged(auth, (u) => setUser(u ? { uid: u.uid, displayName: u.displayName } : null));
    })();
    return () => { unsub && unsub(); };
  }, []);

  // Resolve redirect result early (iOS Safari occasionally delays persistence availability) and log details.
  useEffect(() => {
    (async () => {
      try {
        const { auth, getRedirectResult } = await getAuthModule();
        const result = await getRedirectResult(auth);
        if (result?.user) console.info('[auth] redirect result user restored', result.user.uid);
      } catch (e:any) {
        const code = e?.code || e?.message; if (code !== 'auth/argument-error') setRedirectErr(code);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingTxs(true);
      try {
        const { db, getDocs, query, collection, orderBy } = await (await getFirestoreModule());
        const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date','desc'));
        const snap = await getDocs(q as any);
        if (!cancelled) {
          const list: Tx[] = snap.docs.map(d => ({ ...(d.data() as Omit<Tx,'id'>), id: d.id }));
          setTxs(list); setTxErr(null);
        }
      } catch(e:any) { if(!cancelled) setTxErr(e?.code||e?.message||'load-error'); }
      finally { if(!cancelled) setLoadingTxs(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);


  const manualRefresh = async () => {
    if (!user) return;
    try {
      setLoadingTxs(true);
      const { db, getDocs, query, collection, orderBy } = await (await getFirestoreModule());
      const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date','desc'));
      const snap = await getDocs(q as any);
      const list: Tx[] = snap.docs.map(d => ({ ...(d.data() as Omit<Tx,'id'>), id: d.id }));
      setTxs(list); setTxErr(null);
    } catch(e:any){ setTxErr(e?.code||e?.message||'load-error'); }
    finally { setLoadingTxs(false); }
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
  <SettingsProvider uid={user.uid}>
      <div className="app-container fade-in">
        <TopBar
          name={user.displayName ?? 'You'}
          onSignOut={async () => { const { auth, signOut } = await getAuthModule(); signOut(auth); }}
          onAdd={() => setView('add')}
          onRefresh={manualRefresh}
          refreshing={loadingTxs}
          showActions={view === 'home'}
          onHome={() => { setView('home'); setEditingTx(null); }}
          view={view}
          onOpenSettings={() => setSettingsOpen(true)}
          chartDim={chartDim}
          onToggleChartDim={() => setChartDim(d => d==='category' ? 'payment' : 'category')}
        />
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {view === 'home' && (
          <Suspense fallback={<div className="card" style={{ padding:20 }}>Loading…</div>}>
            <HomeView
              uid={user.uid}
              txs={txs}
              onDeleted={(id) => setTxs(prev => prev.filter(t => t.id !== id))}
              onSelect={(tx) => { setEditingTx(tx); setView('edit'); }}
              chartDim={chartDim}
            />
            {txErr && <div className="alert-error fade-in" style={{ marginTop:12 }}>Load error: {txErr}</div>}
            <DataResetCard uid={user.uid} onCleared={() => setTxs([])} />
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
    </SettingsProvider>
  );
}

// Inline subcomponents moved to /components for modularity.

function DataResetCard({ uid, onCleared }: { uid: string; onCleared: () => void }) {
  if (typeof window === 'undefined' || !/[?&]reset=1/.test(window.location.search)) return null;
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [deleted, setDeleted] = React.useState(0);
  return (
    <div className="card" style={{ marginTop:16, border:'1px dashed var(--color-border-strong)', background:'var(--color-surface-alt)' }}>
      <h3 style={{ marginTop:0, fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>Danger Zone <span style={{ fontSize:'.6rem', fontWeight:600, letterSpacing:'.5px', textTransform:'uppercase', color:'var(--color-text-dim)' }}>Reset Data</span></h3>
      <p style={{ fontSize:'.75rem', lineHeight:1.4, margin:'8px 0 12px' }}>Delete ALL your transactions permanently. This cannot be undone. Use only to start fresh.</p>
      {err && <div className="alert-error" style={{ marginBottom:12 }}>Error: {err}</div>}
      {deleted > 0 && !busy && <div className="badge" style={{ marginBottom:12 }}>{deleted} deleted</div>}
      <button className="btn btn-danger" disabled={busy} onClick={async () => {
        if (busy) return;
        if (!confirm('Delete ALL transactions for this account? This CANNOT be undone.')) return;
        setBusy(true); setErr(null); setDeleted(0);
        try {
          const { db, getDocs, query, collection, writeBatch } = await (await getFirestoreModule());
          let totalDeleted = 0;
          while (true) {
            const snap = await getDocs(query(collection(db, 'users', uid, 'transactions')) as any);
            if (snap.empty) break;
            let batch = writeBatch(db as any);
            let ops = 0;
            for (const d of snap.docs) {
              batch.delete(d.ref);
              ops++;
              if (ops === 450) { await batch.commit(); totalDeleted += ops; setDeleted(totalDeleted); batch = writeBatch(db as any); ops = 0; }
            }
            if (ops) { await batch.commit(); totalDeleted += ops; setDeleted(totalDeleted); }
            if (snap.size < 450) break;
          }
          onCleared();
        } catch(e:any) { setErr(e?.code||e?.message||'reset-failed'); }
        finally { setBusy(false); }
      }}>{busy ? 'Deleting…' : 'Delete All Transactions'}</button>
    </div>
  );
}

// Legacy inline style constants removed in favor of CSS classes.
