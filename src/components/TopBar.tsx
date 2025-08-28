import React from 'react';
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
  return (
    <div className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <h2>SpendTrackX</h2>
      </div>
      <div className="topbar-actions">
        <button className="btn plus-btn" title="Add" aria-label="Add" onClick={onAdd}><span className="plus-glyph" aria-hidden="true">＋</span></button>
        {onToggleChartDim && chartDim && (
          <button className="icon-btn" aria-label={chartDim==='category' ? 'Payment method view' : 'Category view'} title={chartDim==='category' ? 'Payment method view' : 'Category view'} onClick={onToggleChartDim}>
            <Icon name="toggle-dim" />
          </button>
        )}
        <button className="icon-btn" aria-label="Settings" title="Settings" onClick={onOpenSettings}>
          <Icon name="settings" />
        </button>
        <button className="icon-btn" aria-label="Refresh" title="Refresh" disabled={refreshing} onClick={onRefresh}>
          <span className={refreshing ? 'spin' : undefined}><Icon name="refresh" /></span>
        </button>
        {view !== 'home' && (
          <button className="icon-btn" aria-label="Home" title="Home" onClick={onHome}>
            <Icon name="home" />
          </button>
        )}
        <button className="icon-btn" aria-label="Logout" title="Logout" onClick={onSignOut}>
          <Icon name="logout" />
        </button>
      </div>
    </div>
  );
}
