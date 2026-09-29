import { invitarMiembroInputSchema } from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { auth, db } from '../util/admin.js';
import { requerirRol, requerirSesion, validarInput } from '../util/validar.js';

/**
 * El dueño suma a alguien al equipo. Si el email no tiene cuenta, se la crea sin contraseña
 * y se devuelve un link para que la elija; el dueño se lo manda por WhatsApp.
 */
export const invitarMiembro = onCall(async (req) => {
  const { claims } = requerirSesion(req);
  const input = validarInput(invitarMiembroInputSchema, req.data);
  requerirRol(claims, ['dueno']);

  if (input.rol === 'dueno') {
    throw new HttpsError('invalid-argument', 'El local tiene un solo dueño');
  }

  const email = input.email.toLowerCase();
  let usuario = await auth.getUserByEmail(email).catch(() => null);
  const esNuevo = usuario === null;
  usuario ??= await auth.createUser({ email, displayName: input.nombre, emailVerified: false });

  const miembroRef = db.doc(`miembros/${usuario.uid}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(miembroRef)).exists) {
      throw new HttpsError('already-exists', 'Esa persona ya es parte del equipo');
    }
    // El trigger sincronizarClaims le da el rol a partir de este documento.
    tx.create(miembroRef, {
      rol: input.rol,
      nombre: input.nombre,
      email,
      activo: true,
      creadoEn: FieldValue.serverTimestamp(),
    });
  });

  const linkContrasena = esNuevo ? await auth.generatePasswordResetLink(email) : null;
  return { uid: usuario.uid, esNuevo, linkContrasena };
});
