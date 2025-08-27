import type { CategoryId, PaymentMethod } from '../types';

const CATEGORY_SET: Set<CategoryId> = new Set([
  'coffeeshop','hawker','food_centre','cafe','restaurant','buffet','others'
]);

export function normalizeCategory(value: string): CategoryId {
  if (CATEGORY_SET.has(value as CategoryId)) return value as CategoryId;
  // Legacy mappings (best-effort) -> Others if ambiguous
  switch (value) {
    case 'food': return 'hawker';
    case 'coffee': return 'cafe';
    case 'groceries': return 'others';
    default: return 'others';
  }
}

export function normalizePaymentMethod(value: string): PaymentMethod {
  if (value === 'ewallet') return 'qr';
  if (value === 'qr' || value === 'card' || value === 'cash') return value as PaymentMethod;
  return 'card';
}
