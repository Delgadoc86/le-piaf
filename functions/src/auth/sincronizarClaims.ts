import { ROLES, type ClaimsMiMenu, type Rol } from '@mimenu/shared';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { auth, db } from '../util/admin.js';

/**
 * Mantiene los custom claims ({ sa, l: { [localId]: rol } }) en sincronía con
 * locales/{localId}/miembros/{uid}. Un miembro inactivo o borrado pierde el acceso.
 * Después sube usuarios/{uid}.claimsVersion para que el cliente refresque el token.
 */
export const sincronizarClaims = onDocumentWritten('locales/{localId}/miembros/{uid}', async (event) => {
  const { localId, uid } = event.params;
  const despues = event.data?.after.data() as { rol?: Rol; activo?: boolean } | undefined;

  const usuario = await auth.getUser(uid).catch(() => null);
  if (!usuario) {
    logger.warn('sincronizarClaims: el usuario no existe en Auth', { uid, localId });
    return;
  }

  const claims = (usuario.customClaims ?? {}) as ClaimsMiMenu;
  const locales = { ...(claims.l ?? {}) };
  const rolNuevo = despues?.activo !== false && despues?.rol && ROLES.includes(despues.rol) ? despues.rol : null;

  if (rolNuevo) locales[localId] = rolNuevo;
  else delete locales[localId];

  if (locales[localId] === claims.l?.[localId]) return; // sin cambios (evita refrescos innecesarios)

  const nuevos: ClaimsMiMenu = { ...claims, l: locales };
  await auth.setCustomUserClaims(uid, nuevos);
  await db
    .doc(`usuarios/${uid}`)
    .set({ claimsVersion: FieldValue.increment(1) }, { merge: true });
  logger.info('Claims actualizados', { uid, localId, rol: rolNuevo });
});
