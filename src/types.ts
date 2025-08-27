import type { Timestamp, FieldValue } from 'firebase/firestore';

// Venue-oriented categories
export type CategoryId = 'coffeeshop' | 'hawker' | 'food_centre' | 'cafe' | 'restaurant' | 'buffet' | 'others';
// Updated payment methods: replaced legacy 'ewallet' with 'qr' (QR Payment)
export type PaymentMethod = 'card' | 'qr' | 'cash';

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
