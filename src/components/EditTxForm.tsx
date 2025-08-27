import React, { useMemo, useState } from 'react';
import { enableNetwork, disableNetwork, db, doc, serverTimestamp, Timestamp } from '../lib/firebase';
import type { Tx, CategoryId, PaymentMethod } from '../types';

interface Props { uid: string; tx: Tx; onCancel: () => void; onSaved: (tx: Tx) => void; }

export function EditTxForm({ uid, tx, onCancel, onSaved }: Props) {
  const [amount, setAmount] = useState(String(tx.amount));
  const [date, setDate] = useState(() => new Date(tx.date?.toDate?.() ?? tx.date).toISOString().slice(0,10));
  const [categoryId, setCategoryId] = useState<CategoryId>(tx.categoryId);
  const [vendor, setVendor] = useState(tx.vendor || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(tx.paymentMethod || 'card');
  const [note, setNote] = useState(tx.note || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = useMemo(() => Number(amount) > 0 && Number(amount) < 100000 && !!date, [amount, date]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true); setErr(null);
    try {
      await enableNetwork(db).catch(()=>{});
      const ref = doc(db, 'users', uid, 'transactions', tx.id!);
      const updated: Partial<Tx> = { amount: Number(amount), date: Timestamp.fromDate(new Date(date)), categoryId, vendor, paymentMethod, note, updatedAt: serverTimestamp() };
      const { updateDoc } = await import('../lib/firebase');
      await updateDoc(ref as any, updated as any);
      onSaved({ ...tx, ...updated, updatedAt: Timestamp.fromDate(new Date()) } as Tx);
    } catch(e:any) { setErr(e?.code || e?.message || 'Update failed'); }
    finally { setSaving(false); disableNetwork(db).catch(()=>{}); }
  };

  return (
    <form onSubmit={onSubmit} className="card fade-in" style={{ animationDelay:'.05s' }}>
      <h3 style={{ marginTop:0, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'1.05rem' }}>Edit Transaction <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button></h3>
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
      {err && <div className="alert-error" style={{ marginTop:10 }}>Error: {err}</div>}
    </form>
  );
}
