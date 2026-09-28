import { crearLocalInputSchema, DIAS_PRUEBA_DEFAULT, localPorDefecto } from '@mimenu/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../util/admin.js';
import { requerirSesion, validarInput } from '../util/validar.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Crea un local nuevo con el usuario como dueño: locales, slugs, miembros y suscripción en prueba.
 * La unicidad del slug se garantiza con una transacción sobre slugs/{slug}.
 */
export const crearLocal = onCall(async (req) => {
  const { uid, email } = requerirSesion(req);
  const input = validarInput(crearLocalInputSchema, req.data);

  const config = await db.doc('plataforma/config').get();
  const diasPrueba = (config.get('diasPrueba') as number | undefined) ?? DIAS_PRUEBA_DEFAULT;

  const localRef = db.collection('locales').doc();
  const slugRef = db.doc(`slugs/${input.slug}`);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(slugRef)).exists) {
      throw new HttpsError('already-exists', 'Ese nombre de local ya está en uso');
    }
    const ahora = FieldValue.serverTimestamp();
    tx.create(slugRef, { localId: localRef.id });
    tx.create(localRef, {
      ...localPorDefecto({ nombre: input.nombre, zonaHoraria: input.zonaHoraria }),
      slug: input.slug,
      suscripcion: {
        plan: 'completo',
        estado: 'prueba',
        pruebaHasta: Timestamp.fromMillis(Date.now() + diasPrueba * DIA_MS),
      },
      duenoUid: uid,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    // El trigger sincronizarClaims le da el claim de dueño a partir de este documento.
    tx.create(localRef.collection('miembros').doc(uid), {
      rol: 'dueno',
      nombre: req.auth?.token.name ?? email ?? '',
      email: email ?? '',
      activo: true,
      creadoEn: ahora,
    });
  });

  return { localId: localRef.id, slug: input.slug };
});
