import type { Timestamp, FieldValue } from 'firebase/firestore';

export type CategoryId = 'food' | 'coffee' | 'groceries' | 'others';
export type PaymentMethod = 'card' | 'cash' | 'ewallet';

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
