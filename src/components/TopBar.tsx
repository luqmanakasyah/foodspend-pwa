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
  onOpenSettings: () => void;
}

export function TopBar({ name, onSignOut, onAdd, onRefresh, refreshing, showActions, onHome, view, onOpenSettings }: Props) {
  return (
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <h2>SpendTrackX</h2>
      </div>
      <div className="topbar-actions">
        {showActions && (<>
          <button className="icon-btn" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
            <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09c0 .69.4 1.31 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.69 0 1.31.4 1.51 1H21a2 2 0 0 1 0 4h-.09c-.69 0-1.31.4-1.51 1z" />
            </svg>
          </button>
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
        {view !== 'home' && (
          <button className="icon-btn" aria-label="Home" title="Home" onClick={onHome}>
            <svg viewBox="0 0 24 24" width={18} height={18} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V9h6v12" />
            </svg>
          </button>
        )}
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
