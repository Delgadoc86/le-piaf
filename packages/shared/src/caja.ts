/**
 * Caja y contabilización (ROADMAP §12, Fase 4). Un pedido "cuenta" como venta cuando está pagado y no
 * fue anulado: en ese momento la plata entra a la caja. Si después se cancela o se deshace el cobro,
 * se resta. Lo usan contabilizarPedido y cerrarCaja (Functions) y el panel (vista previa del cierre).
 */
import { MEDIOS_PAGO_MANUALES, type MedioPagoManual, type TipoPedido } from './constantes.js';
import { estaAnulado } from './pedidos.js';
import type { MovimientoCaja, Pedido } from './tipos.js';

export type PorMedio = Record<MedioPagoManual, number>;

export const porMedioVacio = (): PorMedio =>
  Object.fromEntries(MEDIOS_PAGO_MANUALES.map((m) => [m, 0])) as PorMedio;

/** ¿El pedido tiene que estar sumado en la caja y en las ventas del día? */
export function debeContabilizarse(p: Pick<Pedido, 'estado' | 'estadoPago'>): boolean {
  return p.estadoPago === 'pagado' && !estaAnulado(p.estado);
}

export interface AportePedido {
  total: number;
  porMedio: PorMedio;
  tipo: TipoPedido;
  productos: Record<string, { nombre: string; cantidad: number; ventas: number }>;
}

/**
 * Lo que un pedido suma a la caja y a las stats. Por medio de pago se toma lo cobrado de verdad
 * (puede ser mitad efectivo, mitad transferencia), topeado al total para no contar el vuelto.
 */
export function aportePedido(p: Pick<Pedido, 'total' | 'tipo' | 'pagos' | 'items'>): AportePedido {
  const porMedio = porMedioVacio();
  let restante = p.total;
  for (const pago of p.pagos) {
    if (pago.estado !== 'aprobado' || !(pago.medio in porMedio) || restante <= 0) continue;
    const monto = Math.min(pago.monto, restante);
    porMedio[pago.medio as MedioPagoManual] += monto;
    restante -= monto;
  }
  const productos: AportePedido['productos'] = {};
  for (const i of p.items) {
    const actual = (productos[i.productoId] ??= { nombre: i.nombre, cantidad: 0, ventas: 0 });
    actual.cantidad += i.cantidad;
    actual.ventas += i.subtotal;
  }
  return { total: p.total, porMedio, tipo: p.tipo, productos };
}

/** Efectivo que tiene que haber en la caja y transferencias que tienen que haber entrado. */
export function esperadoCaja(
  turno: { montoInicial: number; totales: PorMedio },
  movimientos: readonly Pick<MovimientoCaja, 'tipo' | 'monto'>[],
): PorMedio {
  const neto = movimientos.reduce((s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0);
  return {
    efectivo: turno.montoInicial + turno.totales.efectivo + neto,
    transferencia: turno.totales.transferencia,
  };
}

/** Contado − esperado, por medio (positivo = sobra, negativo = falta). */
export function diferenciaCaja(esperado: PorMedio, contado: PorMedio): PorMedio {
  return {
    efectivo: contado.efectivo - esperado.efectivo,
    transferencia: contado.transferencia - esperado.transferencia,
  };
}

/** Ticket promedio en pesos enteros (0 si no hubo pedidos). */
export function ticketPromedio(ventas: number, pedidos: number): number {
  return pedidos > 0 ? Math.round(ventas / pedidos) : 0;
}
