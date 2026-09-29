'use client';

/**
 * Pedidos en el panel: escucha la jornada en tiempo real y aplica los cambios que permite
 * firestore.rules (estado, historial, demora, cobros). Crear pedidos siempre pasa por crearPedido.
 */
import { useEffect, useState } from 'react';
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  claveJornada,
  estadoPagoDe,
  inicioJornada,
  type Cobro,
  type CrearPedidoInput,
  type EstadoPedido,
  type PagoPedido,
  type Pedido,
  type Rol,
  type TipoPedido,
} from '@app/shared';
import { firebase } from '@/lib/firebase/client';

export type PedidoConId = Pedido & { id: string };

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Nuevo',
  aceptado: 'Aceptado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  abierto: 'Abierto',
  cuenta_pedida: 'Cuenta pedida',
  cerrado: 'Cerrado',
};

/** Texto del botón que lleva al estado indicado. */
export const ACCION_HACIA: Partial<Record<EstadoPedido, string>> = {
  en_preparacion: 'Aceptar',
  listo: 'Marcar listo',
  en_camino: 'Salió',
  entregado: 'Entregado',
};

export const ETIQUETA_TIPO: Record<TipoPedido, string> = {
  take_away: 'Para llevar',
  delivery: 'Delivery',
  salon: 'Para comer acá',
};

/** Pedidos de la jornada actual (desde las 06:00 del local), el más nuevo primero. */
export function usePedidosJornada(zonaHoraria: string | undefined) {
  const [jornada, setJornada] = useState(() =>
    zonaHoraria ? claveJornada(new Date(), zonaHoraria) : '',
  );
  const [estado, setEstado] = useState<{
    pedidos: PedidoConId[];
    cargando: boolean;
    error: string | null;
  }>({ pedidos: [], cargando: true, error: null });

  // Cambio de jornada (a las 06:00) sin recargar la página.
  useEffect(() => {
    if (!zonaHoraria) return;
    const revisar = () => setJornada(claveJornada(new Date(), zonaHoraria));
    revisar();
    const t = setInterval(revisar, 60_000);
    return () => clearInterval(t);
  }, [zonaHoraria]);

  useEffect(() => {
    if (!zonaHoraria || !jornada) return;
    const desde = Timestamp.fromDate(inicioJornada(new Date(), zonaHoraria));
    const q = query(
      collection(firebase().db, 'pedidos'),
      where('creadoEn', '>=', desde),
      orderBy('creadoEn', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) =>
        setEstado({
          pedidos: snap.docs.map((d) => ({ ...(d.data() as Pedido), id: d.id })),
          cargando: false,
          error: null,
        }),
      (e) => setEstado((s) => ({ ...s, cargando: false, error: e.message })),
    );
  }, [zonaHoraria, jornada]);

  return { ...estado, jornada };
}

/** El mozo solo opera pedidos de salón y los que cargó él (firestore.rules). */
export function puedeOperar(pedido: Pedido, rol: Rol | null, uid: string): boolean {
  if (rol === 'dueno' || rol === 'encargado') return true;
  return rol === 'mozo' && (pedido.tipo === 'salon' || pedido.mozoUid === uid);
}

const refPedido = (id: string) => doc(firebase().db, 'pedidos', id);

export function cambiarEstado(
  pedido: PedidoConId,
  estado: EstadoPedido,
  uid: string,
  extra: { motivoCancelacion?: string } = {},
) {
  return updateDoc(refPedido(pedido.id), {
    estado,
    historial: arrayUnion({ estado, en: Timestamp.now(), porUid: uid }),
    ...(extra.motivoCancelacion ? { motivoCancelacion: extra.motivoCancelacion } : {}),
    actualizadoEn: serverTimestamp(),
  });
}

export function cambiarDemora(pedido: PedidoConId, minutos: number) {
  return updateDoc(refPedido(pedido.id), {
    tiempoEstimadoMin: Math.max(0, Math.min(300, minutos)),
    actualizadoEn: serverTimestamp(),
  });
}

/** Registra un cobro manual (efectivo o transferencia) y recalcula el estado del pago. */
export function registrarCobro(
  pedido: PedidoConId,
  cobro: Cobro & { pagaCon?: number },
  uid: string,
) {
  const pago: PagoPedido = {
    medio: cobro.medio,
    monto: cobro.monto,
    estado: 'aprobado',
    porUid: uid,
    ...(cobro.pagaCon ? { pagaCon: cobro.pagaCon } : {}),
  };
  const pagos = [...pedido.pagos, pago];
  return updateDoc(refPedido(pedido.id), {
    pagos,
    estadoPago: estadoPagoDe(pagos, pedido.total),
    actualizadoEn: serverTimestamp(),
  });
}

/** Deshace los cobros (por si se marcó pagado por error). */
export function anularCobros(pedido: PedidoConId) {
  return updateDoc(refPedido(pedido.id), {
    pagos: [],
    estadoPago: 'pendiente',
    actualizadoEn: serverTimestamp(),
  });
}

export async function crearPedidoManual(
  input: CrearPedidoInput,
): Promise<{ id: string; numero: number }> {
  const r = await httpsCallable<CrearPedidoInput, { id: string; numero: number }>(
    firebase().functions,
    'crearPedido',
  )(input);
  return r.data;
}

/** Mensaje rápido para mandarle al cliente por WhatsApp según el estado. */
export function mensajeParaCliente(pedido: Pedido, nombreLocal: string): string | null {
  const hola = pedido.cliente?.nombre ? `¡Hola ${pedido.cliente.nombre.split(' ')[0]}!` : '¡Hola!';
  const n = `#${pedido.numero}`;
  switch (pedido.estado) {
    case 'pendiente':
    case 'aceptado':
    case 'en_preparacion':
      return `${hola} Recibimos tu pedido ${n} en ${nombreLocal} y ya lo estamos preparando.${
        pedido.tiempoEstimadoMin ? ` Demora aprox.: ${pedido.tiempoEstimadoMin} min.` : ''
      }`;
    case 'listo':
      return pedido.tipo === 'delivery'
        ? `${hola} Tu pedido ${n} está listo y sale en un ratito 🛵`
        : `${hola} Tu pedido ${n} está listo para retirar 🙌`;
    case 'en_camino':
      return `${hola} Tu pedido ${n} ya va en camino 🛵`;
    case 'entregado':
      return `¡Gracias por tu pedido ${n}! Que lo disfrutes 😋`;
    case 'rechazado':
    case 'cancelado':
      return `${hola} Perdón, no pudimos tomar tu pedido ${n}${
        pedido.motivoCancelacion ? `: ${pedido.motivoCancelacion}` : '.'
      }`;
    default:
      return null;
  }
}

/** Hora corta (HH:mm) en la zona del local. */
export function horaDe(ts: { toDate(): Date } | null | undefined, zonaHoraria: string): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: zonaHoraria,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts.toDate());
}
