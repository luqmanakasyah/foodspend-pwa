import React from 'react';

interface Props {
  name: string;
  onSignOut: () => void;
  onAdd: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  showActions: boolean;
  onHome: () => void;
  view: 'home' | 'add' | 'edit';
}

export function TopBar({ name, onSignOut, onAdd, onRefresh, refreshing, showActions, onHome, view }: Props) {
  return (
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {view === 'add' && <button className="btn btn-secondary" onClick={onHome}>← Home</button>}
        <h2>SpendTrackX</h2>
      </div>
      <div className="topbar-actions">
        {showActions && (<>
          <button className="icon-btn" aria-label="Refresh" title="Refresh" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? (
              <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="spin">
                <path d="M21 2v6h-6" />
                <path d="M3 22v-6h6" />
                <path d="M3 6a9 9 0 0 1 15-3l3 3" opacity="0.35" />
                <path d="M21 18a9 9 0 0 1-15 3l-3-3" opacity="0.35" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 22v-6h6" />
                <path d="M3 6a9 9 0 0 1 15-3l3 3" />
                <path d="M21 18a9 9 0 0 1-15 3l-3-3" />
              </svg>
            )}
          </button>
          <button className="btn plus-btn" title="Add" aria-label="Add" onClick={onAdd}><span className="plus-glyph" aria-hidden="true">＋</span></button>
        </>)}
        <button className="icon-btn" aria-label="Logout" title="Logout" onClick={onSignOut}>
          <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
