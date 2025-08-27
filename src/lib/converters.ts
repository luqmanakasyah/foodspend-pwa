import type { QueryDocumentSnapshot, SnapshotOptions } from 'firebase/firestore';
import type { Tx } from '../types';

// Firestore data converter for Tx objects to keep strong typing.
export const txConverter = {
  toFirestore(tx: Tx) {
    // Exclude id (server generated) & ensure required props present
    const { id, ...rest } = tx;
    return rest;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Tx {
    const data = snapshot.data(options) as Omit<Tx, 'id'>;
    return { id: snapshot.id, ...data };
  }
};