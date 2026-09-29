/**
 * Admin SDK para Server Components y route handlers. Nunca se importa desde el cliente.
 * Solo Firestore: firebase-admin/auth no carga en el runtime de Vercel (jwks-rsa → jose ESM) y la
 * web no lo necesita (el panel usa el SDK de cliente).
 * Con emuladores no necesita credenciales; en Vercel usa FIREBASE_SERVICE_ACCOUNT_JSON (base64).
 */
import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const usaEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

function iniciar(): App {
  const existente = getApps()[0];
  if (existente) return existente;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (usaEmuladores) {
    // Sin esto, la librería de Google busca el servidor de metadatos de GCP y espera ~5 s a que falle.
    process.env.METADATA_SERVER_DETECTION ??= 'none';
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    return initializeApp({ projectId });
  }

  const cuenta = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!cuenta) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_JSON');
  return initializeApp({
    credential: cert(JSON.parse(Buffer.from(cuenta, 'base64').toString('utf8'))),
    projectId,
  });
}

const app = iniciar();
export const adminDb = getFirestore(app);
