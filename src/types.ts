import type { Timestamp, FieldValue } from 'firebase/firestore';

// Category & payment method are now user-configurable; keep string alias + exported defaults
export type CategoryId = string;
export type PaymentMethod = string;

export const DEFAULT_CATEGORIES: CategoryId[] = [
  'coffeeshop','hawker','food_centre','cafe','restaurant','buffet','others'
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  'card','qr','cash'
];

export type Tx = {
  id?: string;
  amount: number; // > 0
  currency: 'SGD';
  date: Timestamp; // Firestore Timestamp
  categoryId: CategoryId;
  vendor: string;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
};
