import { ROLES, type ClaimsLocal, type Rol } from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { auth, db } from '../util/admin.js';

/**
 * Mantiene el custom claim { rol } en sincronía con miembros/{uid}.
 * Un miembro inactivo o borrado pierde el acceso. Después sube usuarios/{uid}.claimsVersion
 * para que el cliente refresque el token.
 */
export const sincronizarClaims = onDocumentWritten('miembros/{uid}', async (event) => {
  const { uid } = event.params;
  const despues = event.data?.after.data() as { rol?: Rol; activo?: boolean; email?: string; nombre?: string } | undefined;

  const usuario = await auth.getUser(uid).catch(() => null);
  if (!usuario) {
    logger.warn('sincronizarClaims: el usuario no existe en Auth', { uid });
    return;
  }

  const actual = (usuario.customClaims ?? {}) as ClaimsLocal;
  const rolNuevo = despues?.activo !== false && despues?.rol && ROLES.includes(despues.rol) ? despues.rol : undefined;
  if (actual.rol === rolNuevo) return; // sin cambios (evita refrescos innecesarios)

  const { rol: _rolViejo, ...resto } = actual;
  await auth.setCustomUserClaims(uid, rolNuevo ? { ...resto, rol: rolNuevo } : resto);
  await db.doc(`usuarios/${uid}`).set(
    {
      email: usuario.email ?? despues?.email ?? '',
      nombre: despues?.nombre ?? usuario.displayName ?? '',
      claimsVersion: FieldValue.increment(1),
    },
    { merge: true },
  );
  logger.info('Claims actualizados', { uid, rol: rolNuevo ?? null });
});
