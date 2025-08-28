import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { useSettings } from '../lib/settings';

interface Props { open: boolean; onClose: () => void; }

export const SettingsDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { categories, paymentMethods, setCategories, setPaymentMethods, reset, theme, setTheme } = useSettings();
  const [catInput, setCatInput] = useState('');
  const [pmInput, setPmInput] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Capture previously focused element when opening; restore on close if focus trapped inside.
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      // Move initial focus inside drawer for accessibility
      setTimeout(() => {
        const heading = containerRef.current?.querySelector<HTMLElement>('h3');
        heading?.focus?.();
      }, 0);
    } else {
      // If currently focused element is inside drawer, restore
      const active = document.activeElement as HTMLElement | null;
      if (active && containerRef.current && containerRef.current.contains(active)) {
        prevFocusRef.current?.focus?.();
      }
    }
  }, [open]);

  const addCategory = () => {
    const v = catInput.trim(); if(!v) return; if(categories.includes(v)) { setCatInput(''); return; }
    setCategories([...categories, v]); setCatInput('');
  };
  const addPayment = () => {
    const v = pmInput.trim(); if(!v) return; if(paymentMethods.includes(v)) { setPmInput(''); return; }
    setPaymentMethods([...paymentMethods, v]); setPmInput('');
  };
  const removeCategory = (idx: number) => { const next = categories.filter((_,i)=>i!==idx); setCategories(next); };
  const removePayment = (idx: number) => { const next = paymentMethods.filter((_,i)=>i!==idx); setPaymentMethods(next); };
  const move = (list: string[], from: number, dir: -1|1) => {
    const to = from + dir; if (to < 0 || to >= list.length) return list; const copy = [...list]; const [item] = copy.splice(from,1); copy.splice(to,0,item); return copy;
  };

  return (
    <div ref={containerRef} className={`settings-drawer ${open ? 'open':'closed'}`} aria-hidden={!open} {...(!open ? { tabIndex: -1 } : {})}>
      <div className="settings-drawer-inner">
        <div className="settings-header">
          <h3 style={{ margin:0 }}>Settings</h3>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="settings-section">
          <h4>Appearance</h4>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {(['system','light','dark'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className="btn btn-secondary"
                style={theme===mode ? { boxShadow:'0 0 0 2px var(--color-accent) inset' }: {}}
              >{mode.charAt(0).toUpperCase()+mode.slice(1)}</button>
            ))}
          </div>
        </div>
        <div className="settings-section">
          <h4>Categories</h4>
          <div className="settings-add-row">
            <input value={catInput} onChange={e=>setCatInput(e.target.value)} placeholder="Add category" onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addCategory(); } }} />
            <button className="btn" type="button" onClick={addCategory} disabled={!catInput.trim()}>Add</button>
          </div>
          <ul className="settings-list">
            {categories.map((c,i) => (
              <li key={c} className="settings-item">
                <span className="settings-item-label">{c}</span>
                <div className="settings-item-actions">
                  <button className="icon-btn" aria-label="Move Up" disabled={i===0} onClick={()=> setCategories(move(categories,i,-1))}><Icon name="up" size={16} /></button>
                  <button className="icon-btn" aria-label="Move Down" disabled={i===categories.length-1} onClick={()=> setCategories(move(categories,i,1))}><Icon name="down" size={16} /></button>
                  <button className="icon-btn danger" aria-label="Delete" onClick={()=> removeCategory(i)}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="settings-section">
          <h4>Payment Methods</h4>
          <div className="settings-add-row">
            <input value={pmInput} onChange={e=>setPmInput(e.target.value)} placeholder="Add method" onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addPayment(); } }} />
            <button className="btn" type="button" onClick={addPayment} disabled={!pmInput.trim()}>Add</button>
          </div>
          <ul className="settings-list">
            {paymentMethods.map((m,i) => (
              <li key={m} className="settings-item">
                <span className="settings-item-label">{m}</span>
                <div className="settings-item-actions">
                  <button className="icon-btn" aria-label="Move Up" disabled={i===0} onClick={()=> setPaymentMethods(move(paymentMethods,i,-1))}><Icon name="up" size={16} /></button>
                  <button className="icon-btn" aria-label="Move Down" disabled={i===paymentMethods.length-1} onClick={()=> setPaymentMethods(move(paymentMethods,i,1))}><Icon name="down" size={16} /></button>
                  <button className="icon-btn danger" aria-label="Delete" onClick={()=> removePayment(i)}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop:24, display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Close</button>
          <button className="btn btn-danger" type="button" onClick={()=>{ if(confirm('Reset categories & methods to defaults?')) reset(); }}>Reset Defaults</button>
        </div>
      </div>
    </div>
  );
};
