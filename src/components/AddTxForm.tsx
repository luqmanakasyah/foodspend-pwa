import React, { useMemo, useState } from 'react';
import { getFirestoreModule } from '../lib/firebase-lite';
import type { Tx, CategoryId, PaymentMethod } from '../types';
import { normalizeCategory, normalizePaymentMethod } from '../lib/normalize';
import { useSettings } from '../lib/settings';
import { displayLabel } from '../lib/normalize';

interface Props { uid: string; onAdded: (tx: Tx) => void; onCancel: () => void; }

export function AddTxForm({ uid, onAdded, onCancel }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { categories, paymentMethods } = useSettings();
  const [categoryId, setCategoryId] = useState<CategoryId>(categories[0] || 'coffeeshop');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0] || 'card');
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
  const { db, collection, addDoc, serverTimestamp, Timestamp } = await (await getFirestoreModule());
  const tx: Tx = { amount: Number(amount), currency: 'SGD', date: Timestamp.fromDate(new Date(date)), categoryId: normalizeCategory(categoryId), vendor, paymentMethod: normalizePaymentMethod(paymentMethod), note, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const ref = await addDoc(collection(db, 'users', uid, 'transactions'), tx as any);
      setAmount(''); setVendor(''); setNote('');
      onAdded({ ...tx, id: ref.id, createdAt: Timestamp.fromDate(new Date()), updatedAt: Timestamp.fromDate(new Date()) });
    } catch(e:any) {
      setSaveErr(e?.code || e?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={onSubmit} className="card form-card fade-in" style={{ animationDelay:'.05s' }}>
      <div className="form-header">
        <h3>Add Transaction</h3>
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <button disabled={!valid || saving} className="btn">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      <div className="form-stack">
        <div className="form-row-grid">
          <div className="field">
            <label>Amount (SGD)</label>
            <div className="field-input">
              <input type="number" inputMode="decimal" step="0.01" min={0.01} max={99999} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Date</label>
            <div className="field-input">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
        </div>
        <div className="form-row-grid">
          <div className="field">
            <label>Category</label>
            <div className="field-input">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value as CategoryId)}>
                {categories.map(c => <option key={c} value={c}>{displayLabel(c)}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Payment</label>
            <div className="field-input">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {paymentMethods.map(p => <option key={p} value={p}>{displayLabel(p)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="field">
          <label>Vendor</label>
          <div className="field-input">
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g., Toast Box" />
          </div>
        </div>
        <div className="field">
          <label>Note</label>
          <div className="field-input">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
          </div>
        </div>
        {saveErr && <div className="alert-error">Error: {saveErr}</div>}
      </div>
    </form>
  );
}
