import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS, CategoryId, PaymentMethod } from '../types';

export interface SettingsState {
  categories: CategoryId[];
  paymentMethods: PaymentMethod[];
  setCategories: (next: CategoryId[]) => void;
  setPaymentMethods: (next: PaymentMethod[]) => void;
  reset: () => void;
}

const SettingsCtx = createContext<SettingsState | null>(null);
const LS_KEY = 'fs_user_settings_v1';

interface PersistedShape { categories: string[]; paymentMethods: string[]; }

function loadPersisted(): PersistedShape | null {
  try { const raw = localStorage.getItem(LS_KEY); if(!raw) return null; return JSON.parse(raw); } catch { return null; }
}

function persist(data: PersistedShape) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const persisted = typeof window !== 'undefined' ? loadPersisted() : null;
  const [categories, setCategoriesState] = useState<CategoryId[]>(() => persisted?.categories || DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethodsState] = useState<PaymentMethod[]>(() => persisted?.paymentMethods || DEFAULT_PAYMENT_METHODS);

  const setCategories = useCallback((next: CategoryId[]) => {
    setCategoriesState(next);
    persist({ categories: next, paymentMethods });
  }, [paymentMethods]);

  const setPaymentMethods = useCallback((next: PaymentMethod[]) => {
    setPaymentMethodsState(next);
    persist({ categories, paymentMethods: next });
  }, [categories]);

  const reset = useCallback(() => {
    setCategoriesState(DEFAULT_CATEGORIES);
    setPaymentMethodsState(DEFAULT_PAYMENT_METHODS);
    persist({ categories: DEFAULT_CATEGORIES, paymentMethods: DEFAULT_PAYMENT_METHODS });
  }, []);

  // If structure changes later, can add migration here.
  useEffect(() => { /* no-op placeholder */ }, []);

  return (
    <SettingsCtx.Provider value={{ categories, paymentMethods, setCategories, setPaymentMethods, reset }}>
      {children}
    </SettingsCtx.Provider>
  );
};

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
