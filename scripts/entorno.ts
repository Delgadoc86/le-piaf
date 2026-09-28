/**
 * Conexión de los scripts a Firebase. Por defecto, SIEMPRE los emuladores (proyecto demo-mimenu).
 * Para un proyecto real hay que pasar --proyecto <id> y --si-estoy-seguro, con credenciales en
 * GOOGLE_APPLICATION_CREDENTIALS. mimenu-prod además exige --confirmo-prod.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (nombre: string) => process.argv.includes(`--${nombre}`);

export const projectId = arg('proyecto') ?? 'demo-mimenu';
export const usaEmuladores = projectId.startsWith('demo-');

if (!usaEmuladores) {
  if (!flag('si-estoy-seguro')) {
    console.error(`✋ Vas a escribir en el proyecto REAL "${projectId}". Repetí con --si-estoy-seguro.`);
    process.exit(1);
  }
  if (projectId.endsWith('-prod') && !flag('confirmo-prod')) {
    console.error('✋ Es producción. Repetí con --confirmo-prod además de --si-estoy-seguro.');
    process.exit(1);
  }
} else {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
}

export const bucketName = arg('bucket') ?? `${projectId}.appspot.com`;

if (getApps().length === 0) initializeApp({ projectId, storageBucket: bucketName });

export const db = getFirestore();
export const auth = getAuth();
export const bucket = getStorage().bucket();

/** URL pública de lectura de un archivo de Storage (las reglas permiten leer locales/**). */
export function urlPublica(ruta: string): string {
  const base = usaEmuladores
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
    : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucketName}/o/${encodeURIComponent(ruta)}?alt=media`;
}

export function destino(): string {
  return usaEmuladores ? `emuladores (${projectId})` : `proyecto REAL ${projectId}`;
}
