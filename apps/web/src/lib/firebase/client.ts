/**
 * SDK de Firebase para el navegador (singleton). Firestore con cache persistente multi-pestaña,
 * así el panel sigue funcionando si se corta internet (ROADMAP §10).
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

export const REGION_FUNCTIONS = 'southamerica-east1';
export const usaEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface Clientes {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

let clientes: Clientes | undefined;

/** Devuelve los clientes de Firebase. Llamar solo desde el navegador (Client Components). */
export function firebase(): Clientes {
  if (clientes) return clientes;
  if (typeof window === 'undefined') {
    throw new Error('firebase() es solo para el navegador; en el servidor usá lib/firebase/admin');
  }

  const yaIniciada = getApps().length > 0;
  const app = yaIniciada ? getApp() : initializeApp(config);
  const db = yaIniciada
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
  const auth = getAuth(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, REGION_FUNCTIONS);

  if (usaEmuladores && !yaIniciada) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  clientes = { app, auth, db, storage, functions };
  return clientes;
}
