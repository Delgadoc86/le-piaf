import { invitarMiembroInputSchema } from '@mimenu/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { auth, db } from '../util/admin.js';
import { requerirRol, requerirSesion, validarInput } from '../util/validar.js';

/**
 * El dueño suma a alguien al equipo. Si el email no tiene cuenta, se la crea sin contraseña
 * y se devuelve un link para que la elija. (El envío por email llega en la Fase 5; mientras,
 * el panel muestra el link para mandarlo por WhatsApp.)
 */
export const invitarMiembro = onCall(async (req) => {
  const { claims } = requerirSesion(req);
  const input = validarInput(invitarMiembroInputSchema, req.data);
  requerirRol(claims, input.localId, ['dueno']);

  if (input.rol === 'dueno') {
    throw new HttpsError('invalid-argument', 'Un local tiene un solo dueño');
  }

  const email = input.email.toLowerCase();
  let usuario = await auth.getUserByEmail(email).catch(() => null);
  const esNuevo = usuario === null;
  usuario ??= await auth.createUser({ email, displayName: input.nombre, emailVerified: false });

  const miembroRef = db.doc(`locales/${input.localId}/miembros/${usuario.uid}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(miembroRef)).exists) {
      throw new HttpsError('already-exists', 'Esa persona ya es parte del equipo');
    }
    tx.create(miembroRef, {
      rol: input.rol,
      nombre: input.nombre,
      email,
      activo: true,
      creadoEn: FieldValue.serverTimestamp(),
    });
    tx.set(
      db.doc(`usuarios/${usuario.uid}`),
      { email, nombre: input.nombre, ...(esNuevo ? { creadoEn: FieldValue.serverTimestamp() } : {}) },
      { merge: true },
    );
  });

  const linkContrasena = esNuevo ? await auth.generatePasswordResetLink(email) : null;
  return { uid: usuario.uid, esNuevo, linkContrasena };
});
