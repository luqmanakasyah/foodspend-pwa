import React, { useEffect, useMemo, useState } from 'react';
import {
  auth, providers, signInWithPopup, onAuthStateChanged, signOut, db,
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc
} from './lib/firebase';
import type { Tx } from './types';

export default function App() {
  const [user, setUser] = useState<null | { uid: string; displayName: string | null }>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName } : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const txCol = collection(db, 'users', user.uid, 'transactions');
    const q = query(txCol, orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Tx[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setTxs(list);
    });
    return () => unsub();
  }, [user]);

  if (!user) return <AuthScreen />;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <Header name={user.displayName ?? 'You'} onSignOut={() => signOut(auth)} />
      <AddTxForm uid={user.uid} />
      <TxList uid={user.uid} txs={txs} />
      <InstallHint />
    </div>
  );
}

function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, providers.google);
    } catch (e: any) {
      // Common silent failures: popup blocked, disallowed domain, provider disabled.
      const code = e?.code || e?.message;
      setErr(code || 'Sign-in failed');
      // Fallback to redirect if popup blocked or unsupported
      if (code && /popup|blocked|cancelled|closed/i.test(code)) {
        import('firebase/auth').then(m => m.signInWithRedirect(auth, providers.google));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '20vh auto', textAlign: 'center' }}>
      <h1>FoodSpend</h1>
      <p>Track your food spend anywhere. Works offline.</p>
      <button onClick={signIn} style={btn} disabled={loading}>{loading ? 'Opening…' : 'Sign in with Google'}</button>
      {err && (
        <div style={{ marginTop: 12, color: '#b91c1c', fontSize: 12 }}>
          {err} – Check popup blocker & that Google provider is enabled.
        </div>
      )}
    </div>
  );
}

function Header({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <h2>👋 Hi, {name}</h2>
      <button onClick={onSignOut} style={btnSecondary}>Sign out</button>
    </div>
  );
}

function AddTxForm({ uid }: { uid: string }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('food');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = useMemo(() => Number(amount) > 0 && date, [amount, date]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
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
      await addDoc(collection(db, 'users', uid, 'transactions'), tx);
      setAmount('');
      setVendor('');
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={card}>
      <h3>Add Transaction</h3>
      <div style={grid2}>
        <label>
          Amount (SGD)
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div style={grid2}>
        <label>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="food">Food</option>
            <option value="coffee">Coffee</option>
            <option value="groceries">Groceries</option>
            <option value="others">Others</option>
          </select>
        </label>
        <label>
          Payment
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
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
    </form>
  );
}

function TxList({ uid, txs }: { uid: string; txs: Tx[] }) {
  const total = txs.reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <div style={card}>
      <h3>Recent ({txs.length}) — Total ${total.toFixed(2)}</h3>
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
