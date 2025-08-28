import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Icon } from './components/Icon';
import { displayLabel } from './lib/normalize';
import type { Tx, CategoryId } from './types';
import { getFirestoreModule } from './lib/firebase-lite';
import { useSettings } from './lib/settings';
import { categoryGradient } from './lib/colors';

interface Props { uid: string; txs: Tx[]; onDeleted: (id: string) => void; onSelect: (tx: Tx) => void; chartDim?: 'category' | 'payment'; }

export default function HomeView({ uid, txs, onDeleted, onSelect, chartDim = 'category' }: Props) {
  return (
    <>
  <MonthlyChart txs={txs} dimension={chartDim} />
      <TxList uid={uid} txs={txs} onDeleted={onDeleted} onSelect={onSelect} />
  <SeedCleanup uid={uid} txs={txs} onDeleted={onDeleted} />
      <InstallHint />
    </>
  );
}

function TxList({ uid, txs, onDeleted, onSelect }: { uid: string; txs: Tx[]; onDeleted: (id: string) => void; onSelect: (tx: Tx) => void }) {
  const [pendingDel, setPendingDel] = useState<null | { id: string; label: string }>(null);
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; total: number; items: Tx[]; sortKey: number }>();
    for (const t of txs) {
      const d = new Date(t.date?.toDate?.() ?? t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!map.has(key)) {
        const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
        map.set(key, { key, label, total: 0, items: [], sortKey: d.getFullYear()*12 + d.getMonth() });
      }
      const bucket = map.get(key)!;
      bucket.items.push(t);
      bucket.total += t.amount || 0;
    }
    return Array.from(map.values()).sort((a,b) => b.sortKey - a.sortKey);
  }, [txs]);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    if (!groups.length) return;
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const toCollapse = groups.filter(g => g.key !== currentKey).map(g => g.key);
    setCollapsedMonths(new Set(toCollapse));
    initRef.current = true;
  }, [groups]);
  const toggleMonth = (key: string) => setCollapsedMonths(prev => { const next = new Set(prev); next.has(key)? next.delete(key): next.add(key); return next; });
  if (txs.length === 0) return <div className="card fade-in" style={{ animationDelay:'.02s' }}><div className="tx-empty">No transactions yet. Use ＋ to add your first.</div></div>;
  return (
    <>
      {groups.map((g, idx) => {
        const isCollapsed = collapsedMonths.has(g.key);
        return (
          <div key={g.key} className="card fade-in" style={{ animationDelay: `${0.02 + idx*0.02}s` }}>
            <div className={`tx-header collapsible ${isCollapsed ? 'is-collapsed':''}`} role="button" tabIndex={0} aria-expanded={!isCollapsed} aria-controls={`month-${g.key}`} onClick={() => toggleMonth(g.key)} onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); toggleMonth(g.key);} }}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg className="chevron" viewBox="0 0 24 24" width={16} height={16} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                {g.label}
              </span>
              <span className="tx-amt">${g.total.toFixed(2)}</span>
            </div>
            {!isCollapsed && (
              <ul className="tx-list" id={`month-${g.key}`}>
                {g.items.map(t => (
                  <li key={t.id} className="tx-row" onClick={() => onSelect(t)} style={{ cursor:'pointer' }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{t.vendor || t.categoryId}</div>
                      <div className="tx-meta">{new Date(t.date?.toDate?.() ?? t.date).toLocaleDateString()} • {t.categoryId}</div>
                    </div>
                    <div className="inline-actions">
                      <div className="tx-amt">${t.amount.toFixed(2)}</div>
                      <button className="icon-btn danger" aria-label="Delete transaction" onClick={(e) => { e.stopPropagation(); setPendingDel({ id: t.id!, label: t.vendor || t.categoryId }); }}><Icon name="trash" size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {pendingDel && (
        <div className="modal-backdrop">
          <div className="modal fade-in" role="dialog" aria-modal="true">
            <h3>Delete Transaction</h3>
            <p style={{ fontSize: '.85rem', lineHeight:1.4 }}>Are you sure you want to delete <strong>{pendingDel.label}</strong>? This action cannot be undone.</p>
            {delErr && <div className="alert-error" style={{ marginTop:8 }}>Delete failed: {delErr}</div>}
            <div className="modal-footer">
              <button className="btn btn-secondary" disabled={deleting} onClick={() => { if(!deleting){ setPendingDel(null); setDelErr(null);} }}>Cancel</button>
              <button className="btn btn-danger" disabled={deleting} onClick={async () => {
                if(!pendingDel) return; setDeleting(true); setDelErr(null);
                try {
                  const { db, doc, deleteDoc } = await (await getFirestoreModule());
                  await deleteDoc(doc(db, 'users', uid, 'transactions', pendingDel.id));
                  onDeleted(pendingDel.id); setPendingDel(null);
                }
                catch(e:any){ setDelErr(e?.code||e?.message||'error'); }
                finally { setDeleting(false); }
              }}>{deleting ? 'Deleting…':'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MonthlyChart({ txs, dimension }: { txs: Tx[]; dimension: 'category' | 'payment' }) {
  const now = new Date();
  const { categories, paymentMethods } = useSettings();
  const keys = dimension === 'category' ? categories : paymentMethods;
  const legacyCategoryMap: Record<string, CategoryId> = { food: 'hawker', coffee: 'cafe', groceries: 'others' };
  const months: { key: string; year: number; month: number; label: string; labelShort: string; total: number; perKey: Record<string, number>; isCurrent: boolean }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    // Initialize perKey map dynamically (categories or payment methods)
    const perInit: Record<string, number> = {};
    for (const k of keys) perInit[k] = 0;
    months.push({ key, year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString(undefined,{month:'short', year:'2-digit'}), labelShort: d.toLocaleString(undefined,{month:'short'}).replace(/\.$/, ''), total:0, perKey: perInit, isCurrent: i===0 });
  }
  for (const t of txs) {
    const d = new Date(t.date?.toDate?.() ?? t.date);
    const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (slot) {
      const amt = t.amount||0; slot.total += amt;
      let keyVal: string;
      if (dimension === 'category') {
        keyVal = legacyCategoryMap[(t as any).categoryId] || (t as any).categoryId;
      } else {
        keyVal = (t as any).paymentMethod || 'unknown';
      }
      if (!keys.includes(keyVal)) {
        // Add unknown bucket dynamically across months
        for (const m of months) { if (!(keyVal in m.perKey)) (m.perKey as any)[keyVal] = 0; }
      }
      slot.perKey[keyVal] += amt;
    }
  }
  const past5 = months.slice(0,5);
  const avg = past5.reduce((s,m)=> s+m.total,0)/(past5.length||1);
  const maxVal = Math.max(avg, ...months.map(m=>m.total), 1);
  return (
  <div className="monthly-chart-wrap" aria-label="Spending last 6 months">
      <div className="category-legend" aria-hidden={false}>
        {keys.map(k => {
          const label = displayLabel(k);
          const className = `swatch cat-${k}`;
          const isPredefined = dimension==='category' && /^(coffeeshop|hawker|food_centre|cafe|restaurant|buffet|others)$/.test(k);
          // Always apply inline gradient for non-predefined categories and all payment methods
          const style = !isPredefined ? { background: categoryGradient(k) } : undefined;
          return <div key={k} className="legend-item"><span className={className} style={style} />{label}</div>;
        })}
      </div>
      <div className="monthly-chart" role="img" aria-hidden={false}>
        {months.map(m => (
          <div key={m.key} className={"monthly-chart-bar" + (m.isCurrent ? ' current':'')} aria-label={`${m.label} $${m.total.toFixed(2)}`} tabIndex={0} title={`${m.label}: $${m.total.toFixed(2)}`}> 
            {m.total>0 && (
              <div className="bar-outer" style={{ height:`${(m.total / maxVal)*100}%`, minHeight:4 }}>
                {keys.map(k => { const v=m.perKey[k]; if(!v) return null; const className = `seg cat-${k}`; const dynamic = !(dimension==='category' && /^(coffeeshop|hawker|food_centre|cafe|restaurant|buffet|others)$/.test(k)); const style = dynamic ? { flex:v, background: categoryGradient(k) } : { flex:v }; return <div key={k} className={className} style={style} aria-hidden="true" />; })}
              </div>
            )}
            <div className="bar-tooltip" role="tooltip">${m.total.toFixed(2)}</div>
            <span>{m.labelShort}</span>
          </div>
        ))}
        <div className="monthly-chart-avg" style={{ bottom: `${(avg / maxVal) * 100}%` }} aria-hidden="true" />
        <div className="monthly-chart-avg-label" style={{ bottom: `${(avg / maxVal) * 100}%` }} aria-hidden="true">${avg.toFixed(2)}</div>
      </div>
    </div>
  );
}

function InstallHint() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [ready, setReady] = useState(false);
  React.useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setReady(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (!ready) return null;
  return (
    <div className="card" style={{ border:'1px dashed var(--color-border-strong)', background:'var(--color-surface-alt)' }}>
  <b>Install SpendTrackX?</b>
      <p>Get faster access and offline support.</p>
      <button className="btn" onClick={async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; setReady(false); }}>Install</button>
    </div>
  );
}

function SeedCleanup({ uid, txs, onDeleted }: { uid: string; txs: Tx[]; onDeleted: (id: string) => void }) {
  // Hidden unless URL includes ?cleanup=1 to avoid exposing in production.
  if (typeof window !== 'undefined' && !/[?&]cleanup=1/.test(window.location.search)) return null;
  const seedTxs = useMemo(() => txs.filter(t => (t.note || '').toLowerCase() === 'seed'), [txs]);
  const [removing, setRemoving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  if (seedTxs.length === 0) return null;
  return (
    <div className="card" style={{ border: '1px dashed var(--color-border-strong)', background: 'var(--color-surface-alt)', marginTop: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div style={{ fontSize: '.7rem', letterSpacing: '.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-dim)', display:'flex', flexDirection:'column', gap:4 }}>
          <span>Cleanup: Remove seed data</span>
          <span style={{ fontSize:10, fontWeight:400 }}>{seedTxs.length} seed transaction{seedTxs.length!==1?'s':''} detected</span>
        </div>
        <button className="btn btn-secondary" disabled={removing} onClick={async () => {
          if (removing) return;
          if (!confirm(`Delete ${seedTxs.length} seed transaction${seedTxs.length!==1?'s':''}? This cannot be undone.`)) return;
          setRemoving(true); setErr(null); setDoneCount(0);
          try {
            const { db, query, collection, where, getDocs, writeBatch } = await (await getFirestoreModule());
            const seedQ = query(collection(db, 'users', uid, 'transactions'), where('note','==','seed'));
            const snap = await getDocs(seedQ as any);
            let batch = writeBatch(db as any);
            let ops = 0;
            for (const d of snap.docs) {
              batch.delete(d.ref);
              ops++;
              if (ops === 450) { await batch.commit(); setDoneCount(c=>c+ops); batch = writeBatch(db as any); ops = 0; }
            }
            if (ops) { await batch.commit(); setDoneCount(c=>c+ops); }
            // Update UI
            for (const t of seedTxs) onDeleted(t.id!);
          } catch (e:any) {
            setErr(e?.code||e?.message||'cleanup-failed');
          } finally {
            setRemoving(false);
          }
        }}>{removing ? 'Removing…' : 'Remove Seed Data'}</button>
      </div>
      {removing && <div style={{ marginTop:8, fontSize:12 }}>Deleting… {doneCount} removed</div>}
      {err && <div className="alert-error" style={{ marginTop:8 }}>Error: {err}</div>}
    </div>
  );
}

