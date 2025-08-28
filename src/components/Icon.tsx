import React from 'react';
import {
  Settings, RefreshCcw, Plus, Home, LogOut, X, ArrowUp, ArrowDown, Trash2, Shuffle, MoreVertical
} from 'lucide-react';

type IconName = 'settings' | 'refresh' | 'plus' | 'home' | 'logout' | 'close' | 'up' | 'down' | 'trash' | 'toggle-dim' | 'menu';

const map: Record<IconName, React.ComponentType<any>> = {
  settings: Settings,
  refresh: RefreshCcw,
  plus: Plus,
  home: Home,
  logout: LogOut,
  close: X,
  up: ArrowUp,
  down: ArrowDown,
  trash: Trash2,
  'toggle-dim': Shuffle,
  menu: MoreVertical,
};

export function Icon({ name, size = 18, strokeWidth = 2, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  const Cmp = map[name];
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} />;
}

export type { IconName };