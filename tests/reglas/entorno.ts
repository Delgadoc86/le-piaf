/** Entorno compartido de los tests de reglas: usuarios con sus claims. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

/** Usuarios de prueba: uid → custom claims (mismo formato que sincronizarClaims). */
export const USUARIOS = {
  dueno: { rol: 'dueno' },
  encargado: { rol: 'encargado' },
  mozo: { rol: 'mozo' },
  cocina: { rol: 'cocina' },
  /** Entró con Google (o tiene cuenta) pero no es parte del equipo. */
  sinRol: {},
  /** Tiene un rol que no existe (claims corruptos o viejos). */
  rolInvalido: { rol: 'superadmin' },
} as const;

export type NombreUsuario = keyof typeof USUARIOS;

export async function crearEntorno(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    // emulators:exec define GCLOUD_PROJECT; el prefijo demo- garantiza que nunca toque un proyecto real.
    projectId: process.env.GCLOUD_PROJECT ?? 'demo-local-tests',
    firestore: { rules: readFileSync(`${raiz}firestore.rules`, 'utf8') },
    storage: { rules: readFileSync(`${raiz}storage.rules`, 'utf8') },
  });
}

export function como(env: RulesTestEnvironment, usuario: NombreUsuario | null) {
  if (usuario === null) return env.unauthenticatedContext();
  return env.authenticatedContext(usuario, { ...USUARIOS[usuario], email: `${usuario}@test.com` });
}
