import {
  aportePedido,
  claveJornada,
  debeContabilizarse,
  DOC_LOCAL,
  partesEnZona,
  type AportePedido,
  type Local,
  type Pedido,
} from '@app/shared';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from '../util/admin.js';

/** Puntero a la caja abierta (lo mantienen abrirCaja y cerrarCaja). */
export const REF_CAJA = () => db.doc('contadores/caja');

/**
 * Suma (o resta) un pedido en statsDiarias/{jornada} y en la caja abierta. Un solo trigger para
 * crear y actualizar: el pedido cuenta cuando está pagado y no anulado (debeContabilizarse).
 * Es idempotente: dentro de la transacción se relee el pedido y `contabilizado` hace de candado,
 * así que reintentos o eventos duplicados no cuentan dos veces. Reemplaza a revertirContabilizacion.
 */
export const contabilizarPedido = onDocumentWritten('pedidos/{id}', async (event) => {
  const despues = event.data?.after;
  if (!despues?.exists) return;
  const inicial = despues.data() as Pedido;
  if (debeContabilizarse(inicial) === Boolean(inicial.contabilizado)) return; // nada que hacer

  const local = (await db.doc(DOC_LOCAL).get()).data() as Local | undefined;
  const zona = local?.zonaHoraria ?? 'America/Argentina/Buenos_Aires';

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(despues.ref);
    const p = snap.data() as Pedido | undefined;
    if (!p) return;
    const debe = debeContabilizarse(p);
    if (debe === Boolean(p.contabilizado)) return;

    const creado = p.creadoEn?.toDate() ?? new Date();
    const jornada = p.jornada ?? claveJornada(creado, zona);

    if (debe) {
      const turnoId = ((await tx.get(REF_CAJA())).get('turnoAbiertoId') as string | null) ?? null;
      const aporte = aportePedido(p);
      const hora = String(Math.floor(partesEnZona(creado, zona).minutos / 60)).padStart(2, '0');
      aplicar(tx, jornada, turnoId, aporte, hora, 1);
      tx.update(despues.ref, {
        contabilizado: true,
        contabilizacion: {
          turnoCajaId: turnoId,
          total: aporte.total,
          porMedio: aporte.porMedio,
          hora,
        },
        ...(turnoId ? { turnoCajaId: turnoId } : {}),
      });
      return;
    }

    // Revertir exactamente lo que se sumó. Una caja ya cerrada no se toca (su cierre queda como está).
    const c = p.contabilizacion;
    if (c) {
      let turnoId = c.turnoCajaId;
      if (turnoId) {
        const turno = await tx.get(db.doc(`turnosCaja/${turnoId}`));
        if (turno.get('estado') !== 'abierto') turnoId = null;
      }
      const aporte = { ...aportePedido(p), total: c.total, porMedio: c.porMedio };
      aplicar(tx, jornada, turnoId, aporte, c.hora, -1);
    }
    tx.update(despues.ref, { contabilizado: false, contabilizacion: FieldValue.delete() });
  });
});

function aplicar(
  tx: Transaction,
  jornada: string,
  turnoId: string | null,
  a: AportePedido,
  hora: string,
  signo: 1 | -1,
) {
  const inc = (n: number) => FieldValue.increment(signo * n);
  const porMedio = Object.fromEntries(
    Object.entries(a.porMedio)
      .filter(([, v]) => v > 0)
      .map(([m, v]) => [m, inc(v)]),
  );
  tx.set(
    db.doc(`statsDiarias/${jornada}`),
    {
      jornada,
      ventas: inc(a.total),
      pedidos: inc(1),
      porMedio,
      porTipo: { [a.tipo]: { ventas: inc(a.total), pedidos: inc(1) } },
      porHora: { [hora]: { ventas: inc(a.total), pedidos: inc(1) } },
      porProducto: Object.fromEntries(
        Object.entries(a.productos).map(([id, x]) => [
          id,
          { nombre: x.nombre, cantidad: inc(x.cantidad), ventas: inc(x.ventas) },
        ]),
      ),
    },
    { merge: true },
  );
  if (turnoId) {
    tx.update(db.doc(`turnosCaja/${turnoId}`), {
      'totales.efectivo': inc(a.porMedio.efectivo),
      'totales.transferencia': inc(a.porMedio.transferencia),
      cantidadPedidos: inc(1),
    });
  }
}
