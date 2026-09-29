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
import { configFirebase as config, REGION_FUNCTIONS, usaEmuladores } from './config';

export { REGION_FUNCTIONS, usaEmuladores };

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

  // Solo cuenta la app por defecto: la web pública usa otra con nombre propio (publico.ts).
  const yaIniciada = getApps().some((a) => a.name === '[DEFAULT]');
  const app = yaIniciada ? getApp() : initializeApp(config);
  const db = yaIniciada
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        // Los formularios dejan campos opcionales en undefined: se omiten en vez de fallar.
        ignoreUndefinedProperties: true,
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
