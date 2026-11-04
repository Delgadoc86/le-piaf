/**
 * Conexión de los scripts a Firebase. Por defecto, SIEMPRE los emuladores (proyecto demo-local).
 * Para el proyecto real (producción) hay que pasar --proyecto <id> y --si-estoy-seguro, con
 * credenciales en GOOGLE_APPLICATION_CREDENTIALS.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
export const flag = (nombre: string) => process.argv.includes(`--${nombre}`);

export const projectId = arg('proyecto') ?? 'demo-local';
export const usaEmuladores = projectId.startsWith('demo-');

if (!usaEmuladores) {
  if (!flag('si-estoy-seguro')) {
    console.error(
      `✋ "${projectId}" es un proyecto REAL (producción). Si es lo que querés, repetí con --si-estoy-seguro.`,
    );
    process.exit(1);
  }
} else {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
}

// Emuladores: <proyecto>.appspot.com (igual que .env.example). Proyectos reales nuevos: <proyecto>.firebasestorage.app.
export const bucketName =
  arg('bucket') ??
  (usaEmuladores ? `${projectId}.appspot.com` : `${projectId}.firebasestorage.app`);

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

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));

function resolverKit(): string {
  const porArg = arg('kit');
  if (porArg) return porArg;
  if (process.env.KIT) return process.env.KIT;

  const candidatos = readdirSync(raiz, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        !['node_modules', '.git', '.githooks', 'apps', 'functions', 'packages', 'scripts', 'tests'].includes(
          d.name,
        ) &&
        existsSync(join(raiz, d.name, 'seed.json')),
    )
    .map((d) => d.name);

  if (candidatos.length === 1) return candidatos[0];
  if (candidatos.length === 0) {
    console.error(
      '❌ No se encontró ninguna carpeta con seed.json. Especificá el kit con --kit <carpeta> o la variable KIT.',
    );
    process.exit(1);
  }
  console.error(
    `❌ Múltiples kits detectados (${candidatos.join(', ')}). Especificá cuál usar con --kit <carpeta> o la variable KIT.`,
  );
  process.exit(1);
}

/** Carpeta con el kit del local (seed.json, assets/, textos). Autodetectada o especificada con --kit. */
export const KIT = resolverKit();
