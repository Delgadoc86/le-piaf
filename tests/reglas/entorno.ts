/** Entorno compartido de los tests de reglas: usuarios con sus claims y datos base. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

export const LOCAL_A = 'local-a';
export const LOCAL_B = 'local-b';

/** Usuarios de prueba: uid → custom claims (mismo formato que sincronizarClaims). */
export const USUARIOS = {
  duenoA: { l: { [LOCAL_A]: 'dueno' } },
  encargadoA: { l: { [LOCAL_A]: 'encargado' } },
  mozoA: { l: { [LOCAL_A]: 'mozo' } },
  cocinaA: { l: { [LOCAL_A]: 'cocina' } },
  duenoB: { l: { [LOCAL_B]: 'dueno' } },
  superAdmin: { sa: true },
  sinLocal: {},
} as const;

export type NombreUsuario = keyof typeof USUARIOS;

export async function crearEntorno(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    // emulators:exec define GCLOUD_PROJECT; el prefijo demo- garantiza que nunca toque un proyecto real.
    projectId: process.env.GCLOUD_PROJECT ?? 'demo-mimenu-tests',
    firestore: { rules: readFileSync(`${raiz}firestore.rules`, 'utf8') },
    storage: { rules: readFileSync(`${raiz}storage.rules`, 'utf8') },
  });
}

export function como(env: RulesTestEnvironment, usuario: NombreUsuario | null) {
  if (usuario === null) return env.unauthenticatedContext();
  return env.authenticatedContext(usuario, { ...USUARIOS[usuario], email: `${usuario}@test.com` });
}
