import type { ClaimsMiMenu, Rol } from '@mimenu/shared';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { z } from 'zod';

/** Valida el input de una callable con un esquema zod de @mimenu/shared. */
export function validarInput<S extends z.ZodType>(esquema: S, data: unknown): z.infer<S> {
  const r = esquema.safeParse(data);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    throw new HttpsError('invalid-argument', `Datos inválidos: ${detalle}`);
  }
  return r.data;
}

export function requerirSesion(req: CallableRequest): { uid: string; email?: string; claims: ClaimsMiMenu } {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Tenés que iniciar sesión');
  const email = req.auth.token.email;
  return {
    uid: req.auth.uid,
    ...(email ? { email } : {}),
    claims: req.auth.token as unknown as ClaimsMiMenu,
  };
}

export function requerirRol(claims: ClaimsMiMenu, localId: string, roles: readonly Rol[]): void {
  if (claims.sa === true) return;
  const rol = claims.l?.[localId];
  if (!rol || !roles.includes(rol)) {
    throw new HttpsError('permission-denied', 'No tenés permiso para esto en este local');
  }
}
