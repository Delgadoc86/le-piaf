import { ajustePreciosInputSchema, planAjuste, type ProductoDatos } from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { db } from '../util/admin.js';
import { requerirRol, requerirSesion, validarInput } from '../util/validar.js';

const LOTE = 500; // límite de escrituras por batch de Firestore

/**
 * Actualización masiva de precios (dueño o encargado). Recalcula con planAjuste (el mismo cálculo
 * que la vista previa del panel), escribe en lotes de 500 y deja registro en auditoria.
 */
export const ajustarPrecios = onCall(async (req) => {
  const { uid, claims } = requerirSesion(req);
  requerirRol(claims, ['dueno', 'encargado']);
  const input = validarInput(ajustePreciosInputSchema, req.data);

  const snap = await db.collection('productos').get();
  const productos = snap.docs.map((d) => ({ ...(d.data() as ProductoDatos), id: d.id }));
  const plan = planAjuste(productos, input);

  for (let i = 0; i < plan.length; i += LOTE) {
    const batch = db.batch();
    for (const c of plan.slice(i, i + LOTE)) {
      batch.update(db.doc(`productos/${c.id}`), {
        precio: c.despues.precio,
        ...(c.despues.variantes.length > 0 ? { variantes: c.despues.variantes } : {}),
        actualizadoEn: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  await db.collection('auditoria').add({
    accion: 'ajuste_precios',
    detalle: {
      alcance: input.alcance,
      ids: input.ids,
      ajuste: input.ajuste,
      multiplo: input.multiplo,
      modo: input.modo,
      productos: plan.map((c) => ({ id: c.id, antes: c.antes.precio, despues: c.despues.precio })),
    },
    porUid: uid,
    en: FieldValue.serverTimestamp(),
  });

  return { actualizados: plan.length };
});
