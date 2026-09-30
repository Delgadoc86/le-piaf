import {
  cancelarPedidoClienteInputSchema,
  puedeCancelarCliente,
  type CanceladoPor,
  type EstadoPedido,
  type Pedido,
} from '@app/shared';
import { FieldValue, Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../util/admin.js';
import { validarInput } from '../util/validar.js';

const MOTIVO: Record<Exclude<CanceladoPor, 'local'>, string> = {
  cliente: 'Lo cancelaste vos',
  vencido: 'No se confirmó por WhatsApp a tiempo',
};

/** Cancela dentro de una transacción si el pedido sigue sin aceptar (y, si se pide, sin confirmar). */
async function cancelar(
  ref: DocumentReference,
  por: Exclude<CanceladoPor, 'local'>,
  soloSiSinConfirmar: boolean,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data() as Pedido | undefined;
    if (!p || !puedeCancelarCliente(p.estado)) return false;
    if (soloSiSinConfirmar && !p.porConfirmar) return false;
    const estado: EstadoPedido = 'cancelado';
    tx.update(ref, {
      estado,
      canceladoPor: por,
      motivoCancelacion: MOTIVO[por],
      porConfirmar: false,
      confirmarAntesDe: FieldValue.delete(),
      historial: FieldValue.arrayUnion({ estado, en: Timestamp.now() }),
      actualizadoEn: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

/**
 * El cliente cancela su pedido desde /pedido/[token], solo mientras el local no lo aceptó.
 * El token (secreto, viaja en el link) es la credencial: no hace falta cuenta.
 */
export const cancelarPedidoCliente = onCall(async (req) => {
  const { token } = validarInput(cancelarPedidoClienteInputSchema, req.data);
  const snap = await db.collection('pedidos').where('seguimientoToken', '==', token).limit(1).get();
  const ref = snap.docs[0]?.ref;
  if (!ref) throw new HttpsError('not-found', 'No encontramos ese pedido');
  const ok = await cancelar(ref, 'cliente', false);
  if (!ok) {
    throw new HttpsError(
      'failed-precondition',
      'El local ya lo está preparando: para cancelarlo, escribile por WhatsApp.',
    );
  }
  return { ok: true };
});

/** Cancela los pedidos de clientes nuevos que no se confirmaron a tiempo. */
export async function cancelarPedidosVencidos(ahora = new Date()): Promise<number> {
  const vencidos = await db
    .collection('pedidos')
    .where('confirmarAntesDe', '<=', Timestamp.fromDate(ahora))
    .limit(200)
    .get();
  let cancelados = 0;
  for (const d of vencidos.docs) {
    if (await cancelar(d.ref, 'vencido', true)) cancelados++;
  }
  if (cancelados > 0) logger.info('Pedidos sin confirmar cancelados', { cancelados });
  return cancelados;
}

/** Cada 5 minutos: el pedido sin confirmar se cancela, como mucho, 5 min después de vencer. */
export const cancelarPedidosSinConfirmar = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'America/Argentina/Buenos_Aires' },
  async () => {
    await cancelarPedidosVencidos();
  },
);

/**
 * Cuando un pedido se entrega, el cliente pasa a ser "de confianza": en los próximos pedidos ya no
 * se le pide confirmar por WhatsApp (ver requiereConfirmacion).
 */
export const registrarClienteEntregado = onDocumentUpdated('pedidos/{id}', async (event) => {
  const antes = event.data?.before.data() as Pedido | undefined;
  const despues = event.data?.after.data() as Pedido | undefined;
  const telefono = despues?.cliente?.telefono;
  if (!antes || !despues || !telefono) return;
  if (antes.estado === 'entregado' || despues.estado !== 'entregado') return;
  await db
    .doc(`clientes/${telefono}`)
    .set({ telefono, entregados: FieldValue.increment(1) }, { merge: true });
});
