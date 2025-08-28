import type { CategoryId, PaymentMethod } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../types';

const LEGACY_CATEGORY_MAP: Record<string, CategoryId> = {
  food: 'hawker', coffee: 'cafe', groceries: 'others'
};

export function normalizeCategory(value: string): CategoryId {
  if (!value) return 'others';
  if (DEFAULT_CATEGORIES.includes(value)) return value;
  if (LEGACY_CATEGORY_MAP[value]) return LEGACY_CATEGORY_MAP[value];
  // Allow custom user-defined category labels (lowercase slug form internally)
  return value.trim().toLowerCase().replace(/\s+/g,'_');
}

export function normalizePaymentMethod(value: string): PaymentMethod {
  if (!value) return 'card';
  if (value === 'ewallet') return 'qr';
  if (DEFAULT_PAYMENT_METHODS.includes(value)) return value;
  return value.trim().toLowerCase().replace(/\s+/g,'_');
}
