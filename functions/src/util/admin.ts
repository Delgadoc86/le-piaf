import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
// Los opcionales (nota, referencia…) llegan como undefined: se omiten en vez de fallar.
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
