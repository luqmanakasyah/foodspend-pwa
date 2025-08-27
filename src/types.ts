export type Tx = {
  id?: string;
  amount: number;
  currency: string;
  date: any; // Firestore Timestamp or Date
  categoryId: string;
  vendor: string;
  paymentMethod: string;
  note?: string;
  createdAt?: any;
  updatedAt?: any;
};
