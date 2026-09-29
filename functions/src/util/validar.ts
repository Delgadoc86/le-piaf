import type { ClaimsLocal, Rol } from '@app/shared';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import type { z } from 'zod';

/** Valida el input de una callable con un esquema zod de @app/shared. */
export function validarInput<S extends z.ZodType>(esquema: S, data: unknown): z.infer<S> {
  const r = esquema.safeParse(data);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    throw new HttpsError('invalid-argument', `Datos inválidos: ${detalle}`);
  }
  return r.data;
}

export function requerirSesion(req: CallableRequest): { uid: string; email?: string; claims: ClaimsLocal } {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Tenés que iniciar sesión');
  const email = req.auth.token.email;
  return {
    uid: req.auth.uid,
    ...(email ? { email } : {}),
    claims: req.auth.token as unknown as ClaimsLocal,
  };
}

export function requerirRol(claims: ClaimsLocal, roles: readonly Rol[]): void {
  if (!claims.rol || !roles.includes(claims.rol)) {
    throw new HttpsError('permission-denied', 'No tenés permiso para esto');
  }
}
