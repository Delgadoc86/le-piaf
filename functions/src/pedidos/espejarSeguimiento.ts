import type { Pedido, Seguimiento } from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../util/admin.js';

type CamposEspejados = Pick<
  Seguimiento,
  'estado' | 'tiempoEstimadoMin' | 'motivoCancelacion' | 'estadoPago' | 'total' | 'costoEnvio'
>;

/**
 * Copia al espejo público seguimiento/{token} lo que el cliente ve en /pedido/[token]
 * cuando el local cambia el estado, el tiempo estimado, el pago o el costo de envío del pedido.
 */
export const espejarSeguimiento = onDocumentUpdated('pedidos/{id}', async (event) => {
  const antes = event.data?.before.data() as Pedido | undefined;
  const despues = event.data?.after.data() as Pedido | undefined;
  if (!antes || !despues?.seguimientoToken) return;

  const cambios: Partial<CamposEspejados> = {};
  if (antes.estado !== despues.estado) cambios.estado = despues.estado;
  if (antes.estadoPago !== despues.estadoPago) cambios.estadoPago = despues.estadoPago;
  if (
    antes.tiempoEstimadoMin !== despues.tiempoEstimadoMin &&
    despues.tiempoEstimadoMin !== undefined
  ) {
    cambios.tiempoEstimadoMin = despues.tiempoEstimadoMin;
  }
  if (antes.motivoCancelacion !== despues.motivoCancelacion && despues.motivoCancelacion) {
    cambios.motivoCancelacion = despues.motivoCancelacion;
  }
  if (antes.total !== despues.total || antes.costoEnvio !== despues.costoEnvio) {
    cambios.total = despues.total;
    cambios.costoEnvio = despues.costoEnvio;
  }
  if (Object.keys(cambios).length === 0) return;

  await db
    .doc(`seguimiento/${despues.seguimientoToken}`)
    .set({ ...cambios, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true });
});
