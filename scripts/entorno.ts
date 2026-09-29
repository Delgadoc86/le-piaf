/**
 * Conexión de los scripts a Firebase. Por defecto, SIEMPRE los emuladores (proyecto demo-local).
 * Para el proyecto real (producción) hay que pasar --proyecto <id> y --si-estoy-seguro, con
 * credenciales en GOOGLE_APPLICATION_CREDENTIALS.
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

export const projectId = arg('proyecto') ?? 'demo-local';
export const usaEmuladores = projectId.startsWith('demo-');

if (!usaEmuladores) {
  if (!flag('si-estoy-seguro')) {
    console.error(`✋ "${projectId}" es un proyecto REAL (producción). Si es lo que querés, repetí con --si-estoy-seguro.`);
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

/** Carpeta con el kit del local (seed.json, assets/, textos). En una copia del repo, se cambia acá. */
export const KIT = arg('kit') ?? 'silverio';
