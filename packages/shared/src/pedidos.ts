/**
 * Reglas de operación del pedido (ROADMAP §5 "Máquina de estados"): a qué estado se puede pasar,
 * cuál es el paso siguiente, cuánto se cobró y la jornada del local. Las usan el panel y las Functions.
 */
import {
  HORA_CORTE_JORNADA,
  MEDIOS_PAGO_MANUALES,
  type EstadoPagoPedido,
  type EstadoPedido,
  type MedioPagoManual,
  type TipoPedido,
} from './constantes.js';
import { partesEnZona } from './horarios.js';
import type { PagoPedido } from './tipos.js';

const MINUTOS_DIA = 24 * 60;

// ─── Estados ─────────────────────────────────────────────────────────────────

/**
 * Transiciones válidas del circuito web / mostrador. "Aceptar" lleva directo a preparación
 * (en un local chico no hace falta el paso intermedio); "aceptado" se mantiene por compatibilidad.
 */
const TRANSICIONES: Partial<Record<EstadoPedido, readonly EstadoPedido[]>> = {
  pendiente: ['aceptado', 'en_preparacion', 'rechazado', 'cancelado'],
  aceptado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['en_camino', 'entregado', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
};

export function puedePasar(de: EstadoPedido, a: EstadoPedido, tipo: TipoPedido): boolean {
  if (a === 'en_camino' && tipo !== 'delivery') return false;
  return TRANSICIONES[de]?.includes(a) ?? false;
}

/** El paso "normal" siguiente (el botón grande del panel), o null si ya terminó. */
export function siguienteEstado(estado: EstadoPedido, tipo: TipoPedido): EstadoPedido | null {
  switch (estado) {
    case 'pendiente':
    case 'aceptado':
      return 'en_preparacion';
    case 'en_preparacion':
      return 'listo';
    case 'listo':
      return tipo === 'delivery' ? 'en_camino' : 'entregado';
    case 'en_camino':
      return 'entregado';
    default:
      return null;
  }
}

/** El cliente puede cancelar desde su seguimiento solo mientras el local no lo aceptó. */
export function puedeCancelarCliente(estado: EstadoPedido): boolean {
  return estado === 'pendiente';
}

export const CONFIRMACION_POR_DEFECTO = { clientesNuevos: true, aceptarSinConfirmar: false };

/** Config de confirmación del local, con los valores por defecto si todavía no la eligió. */
export function configConfirmacion(pedidos: {
  confirmacion?: { clientesNuevos: boolean; aceptarSinConfirmar: boolean } | undefined;
}): { clientesNuevos: boolean; aceptarSinConfirmar: boolean } {
  return pedidos.confirmacion ?? CONFIRMACION_POR_DEFECTO;
}

/** ¿Hay que pedirle a este cliente que confirme por WhatsApp? Sí, si nunca recibió un pedido. */
export function requiereConfirmacion(
  cliente: { entregados?: number } | undefined,
  config: { clientesNuevos: boolean },
): boolean {
  return config.clientesNuevos && (cliente?.entregados ?? 0) < 1;
}

/** Cancelado o rechazado: no suma a la caja ni cuenta como venta. */
export function estaAnulado(estado: EstadoPedido): boolean {
  return estado === 'cancelado' || estado === 'rechazado';
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

/** Suma de lo cobrado (pagos aprobados). */
export function totalCobrado(pagos: readonly Pick<PagoPedido, 'monto' | 'estado'>[]): number {
  return pagos.reduce((s, p) => (p.estado === 'aprobado' ? s + p.monto : s), 0);
}

export function estadoPagoDe(
  pagos: readonly Pick<PagoPedido, 'monto' | 'estado'>[],
  total: number,
): EstadoPagoPedido {
  const cobrado = totalCobrado(pagos);
  if (cobrado <= 0) return 'pendiente';
  return cobrado >= total ? 'pagado' : 'parcial';
}

/**
 * Total con el costo de envío que confirma el local (delivery sin zonas: se arregla por WhatsApp).
 * Misma cuenta que exige firestore.rules al cambiar costoEnvio.
 */
export function totalConEnvio(
  p: { subtotal: number; descuento: number },
  costoEnvio: number,
): number {
  return p.subtotal - p.descuento + costoEnvio;
}

/** Vuelto a preparar si paga en efectivo con un billete mayor (0 si no corresponde). */
export function vuelto(total: number, pagaCon: number | undefined): number {
  return pagaCon && pagaCon > total ? pagaCon - total : 0;
}

export interface ResumenCaja {
  /** Cobrado por medio de pago. */
  porMedio: Record<MedioPagoManual, number>;
  cobrado: number;
  /** Lo que falta cobrar de pedidos no anulados. */
  porCobrar: number;
  /** Suma de los totales de pedidos no anulados. */
  vendido: number;
  pedidos: number;
  anulados: number;
}

/** Totales del día para el panel: qué entró en efectivo, qué por transferencia y qué falta cobrar. */
export function resumenCaja(
  pedidos: readonly { estado: EstadoPedido; total: number; pagos: readonly PagoPedido[] }[],
): ResumenCaja {
  const porMedio = Object.fromEntries(MEDIOS_PAGO_MANUALES.map((m) => [m, 0])) as Record<
    MedioPagoManual,
    number
  >;
  const r: ResumenCaja = {
    porMedio,
    cobrado: 0,
    porCobrar: 0,
    vendido: 0,
    pedidos: 0,
    anulados: 0,
  };
  for (const p of pedidos) {
    if (estaAnulado(p.estado)) {
      r.anulados++;
      continue;
    }
    r.pedidos++;
    r.vendido += p.total;
    for (const pago of p.pagos) {
      if (pago.estado !== 'aprobado') continue;
      if (pago.medio in porMedio) porMedio[pago.medio as MedioPagoManual] += pago.monto;
      r.cobrado += pago.monto;
    }
    r.porCobrar += Math.max(0, p.total - totalCobrado(p.pagos));
  }
  return r;
}

// ─── Jornada ─────────────────────────────────────────────────────────────────

/** Minutos transcurridos desde el inicio de la jornada (corte a HORA_CORTE_JORNADA, hora local). */
function minutosDeJornada(instante: Date, zonaHoraria: string): number {
  const { minutos } = partesEnZona(instante, zonaHoraria);
  return (minutos - HORA_CORTE_JORNADA * 60 + MINUTOS_DIA) % MINUTOS_DIA;
}

/** Instante en que empezó la jornada actual (p. ej. hoy a las 06:00 hora del local). */
export function inicioJornada(instante: Date, zonaHoraria: string): Date {
  const ms =
    instante.getTime() -
    minutosDeJornada(instante, zonaHoraria) * 60_000 -
    instante.getUTCSeconds() * 1000 -
    instante.getUTCMilliseconds();
  return new Date(ms);
}

/**
 * Clave YYYY-MM-DD de la jornada: la madrugada del sábado (antes de las 06:00) sigue siendo el
 * viernes. Se usa para numerar pedidos (#1, #2…) sin que el contador se reinicie a medianoche.
 */
export function claveJornada(instante: Date, zonaHoraria: string): string {
  return partesEnZona(inicioJornada(instante, zonaHoraria), zonaHoraria).fecha;
}
