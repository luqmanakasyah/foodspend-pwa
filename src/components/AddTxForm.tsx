import React, { useMemo, useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp, enableNetwork, disableNetwork, db } from '../lib/firebase';
import type { Tx, CategoryId, PaymentMethod } from '../types';

interface Props { uid: string; onAdded: (tx: Tx) => void; onCancel: () => void; }

export function AddTxForm({ uid, onAdded, onCancel }: Props) {
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
      await enableNetwork(db).catch(()=>{});
      const tx: Tx = { amount: Number(amount), currency: 'SGD', date: Timestamp.fromDate(new Date(date)), categoryId, vendor, paymentMethod, note, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'users', uid, 'transactions'), tx);
      setAmount(''); setVendor(''); setNote('');
      onAdded({ ...tx, id: ref.id, createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date()) });
      disableNetwork(db).catch(()=>{});
    } catch(e:any) {
      setSaveErr(e?.code || e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={onSubmit} className="card fade-in" style={{ animationDelay:'.05s' }}>
      <h3 style={{ marginTop:0, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'1.05rem' }}>Add Transaction <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button></h3>
      <div className="grid2">
        <label>Amount (SGD)
          <input type="number" step="0.01" min={0.01} max={99999} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div className="grid2">
        <label>Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CategoryId)}>
            <option value="food">Food</option>
            <option value="coffee">Coffee</option>
            <option value="groceries">Groceries</option>
            <option value="others">Others</option>
          </select>
        </label>
        <label>Payment
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="ewallet">eWallet</option>
          </select>
        </label>
      </div>
      <label>Vendor
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g., Toast Box" />
      </label>
      <label>Note
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
