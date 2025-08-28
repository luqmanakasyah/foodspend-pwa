import React, { useMemo, useState } from 'react';
import { enableNetwork, disableNetwork, db, doc, serverTimestamp, Timestamp } from '../lib/firebase';
import type { Tx, CategoryId, PaymentMethod } from '../types';
import { normalizeCategory, normalizePaymentMethod } from '../lib/normalize';
import { useSettings } from '../lib/settings';

interface Props { uid: string; tx: Tx; onCancel: () => void; onSaved: (tx: Tx) => void; }

export function EditTxForm({ uid, tx, onCancel, onSaved }: Props) {
  const [amount, setAmount] = useState(String(tx.amount));
  const [date, setDate] = useState(() => new Date(tx.date?.toDate?.() ?? tx.date).toISOString().slice(0,10));
  const legacyCategoryMap: Record<string, CategoryId> = { food: 'hawker', coffee: 'cafe', groceries: 'others' };
  const initialCat = legacyCategoryMap[(tx as any).categoryId] || (tx.categoryId as any);
  const legacyCat = (tx.categoryId as any);
  const normalizedCat: CategoryId = normalizeCategory(legacyCat);
  const { categories, paymentMethods } = useSettings();
  const [categoryId, setCategoryId] = useState<CategoryId>(normalizedCat);
  const [vendor, setVendor] = useState(tx.vendor || '');
  // Normalize legacy 'ewallet' -> 'qr'
  const legacyPm = normalizePaymentMethod(tx.paymentMethod as any);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((legacyPm as PaymentMethod) || paymentMethods[0] || 'card');
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
  const updated: Partial<Tx> = { amount: Number(amount), date: Timestamp.fromDate(new Date(date)), categoryId: normalizeCategory(categoryId), vendor, paymentMethod: normalizePaymentMethod(paymentMethod), note, updatedAt: serverTimestamp() };
      const { updateDoc } = await import('../lib/firebase');
      await updateDoc(ref as any, updated as any);
      onSaved({ ...tx, ...updated, updatedAt: Timestamp.fromDate(new Date()) } as Tx);
    } catch(e:any) { setErr(e?.code || e?.message || 'Update failed'); }
    finally { setSaving(false); disableNetwork(db).catch(()=>{}); }
  };

  return (
    <form onSubmit={onSubmit} className="card form-card fade-in" style={{ animationDelay:'.05s' }}>
      <div className="form-header">
        <h3>Edit Transaction</h3>
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
              <input type="number" step="0.01" min={0.01} max={99999} value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Payment</label>
            <div className="field-input">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                {paymentMethods.map(p => <option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
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
        {err && <div className="alert-error">Error: {err}</div>}
      </div>
    </form>
  );
}
