import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

interface Props {
  name: string;
  onSignOut: () => void;
  onAdd: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  showActions: boolean;
  onHome: () => void;
  view: 'home' | 'add' | 'edit';
  onOpenSettings: () => void;
  chartDim?: 'category' | 'payment';
  onToggleChartDim?: () => void;
}

export function TopBar({ name, onSignOut, onAdd, onRefresh, refreshing, showActions, onHome, view, onOpenSettings, chartDim, onToggleChartDim }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [menuOpen]);
  return (
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <h2>SpendTrackX</h2>
      </div>
      <div className="topbar-actions" style={{ position:'relative' }}>
        {showActions && (
          <>
            <button className="btn plus-btn" title="Add" aria-label="Add" onClick={onAdd}><span className="plus-glyph" aria-hidden="true">＋</span></button>
            <button className="icon-btn" aria-label="More" title="More" onClick={() => setMenuOpen(o=>!o)}>
              <Icon name="menu" />
            </button>
            {menuOpen && (
              <div ref={menuRef} className="dropdown-menu" style={{ position:'absolute', top:'100%', right:0, marginTop:6, background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:8, padding:6, display:'flex', flexDirection:'column', gap:4, minWidth:180, boxShadow:'var(--shadow-md)', zIndex:50 }}>
                {onToggleChartDim && chartDim && (
                  <button className="menu-item" onClick={() => { onToggleChartDim(); setMenuOpen(false); }}>
                    <Icon name="toggle-dim" />
                    <span style={{ flex:1 }}>View: {chartDim==='category' ? 'Payment Methods' : 'Categories'}</span>
                  </button>
                )}
                <button className="menu-item" onClick={() => { onOpenSettings(); setMenuOpen(false); }}>
                  <Icon name="settings" />
                  <span style={{ flex:1 }}>Settings</span>
                </button>
                <button className="menu-item" disabled={refreshing} onClick={() => { onRefresh(); setMenuOpen(false); }}>
                  <span className={refreshing ? 'spin' : undefined}><Icon name="refresh" /></span>
                  <span style={{ flex:1 }}>Refresh</span>
                </button>
                {view !== 'home' && (
                  <button className="menu-item" onClick={() => { onHome(); setMenuOpen(false); }}>
                    <Icon name="home" />
                    <span style={{ flex:1 }}>Home</span>
                  </button>
                )}
                <button className="menu-item" onClick={() => { onSignOut(); setMenuOpen(false); }}>
                  <Icon name="logout" />
                  <span style={{ flex:1 }}>Logout</span>
                </button>
              </div>
            )}
          </>
        )}
        {!showActions && view !== 'home' && (
          <button className="icon-btn" aria-label="Home" title="Home" onClick={onHome}>
            <Icon name="home" />
          </button>
        )}
      </div>
    </div>
  );
}
