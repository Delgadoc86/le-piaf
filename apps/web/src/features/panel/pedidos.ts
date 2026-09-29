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

// ─── Tablero ─────────────────────────────────────────────────────────────────

export type IdEtapa = 'nuevos' | 'preparacion' | 'listos';

/**
 * Columnas del tablero con su color (el mismo en el encabezado, el borde de la tarjeta y el botón
 * que lleva a esa etapa): ámbar = hay que atender, azul = en la cocina, verde = listo.
 */
export const ETAPAS: {
  id: IdEtapa;
  titulo: string;
  corto: string;
  estados: readonly EstadoPedido[];
  vacio: string;
}[] = [
  {
    id: 'nuevos',
    titulo: 'Nuevos',
    corto: 'Nuevos',
    estados: ['pendiente', 'aceptado'],
    vacio: 'Sin pedidos nuevos. Cuando entre uno, suena y aparece acá.',
  },
  {
    id: 'preparacion',
    titulo: 'En preparación',
    corto: 'Preparando',
    estados: ['en_preparacion'],
    vacio: 'Nada en preparación.',
  },
  {
    id: 'listos',
    titulo: 'Listos para entregar',
    corto: 'Listos',
    estados: ['listo', 'en_camino'],
    vacio: 'Nada esperando entrega.',
  },
];

export const COLOR_ETAPA: Record<
  IdEtapa,
  { encabezado: string; fondo: string; borde: string; boton: string; punto: string }
> = {
  nuevos: {
    encabezado: 'bg-amber-400 text-amber-950',
    fondo: 'bg-amber-500/[0.06]',
    borde: 'border-l-amber-400',
    boton: 'bg-amber-400 text-amber-950 hover:bg-amber-500',
    punto: 'bg-amber-400',
  },
  preparacion: {
    encabezado: 'bg-sky-600 text-white',
    fondo: 'bg-sky-500/[0.06]',
    borde: 'border-l-sky-500',
    boton: 'bg-sky-600 text-white hover:bg-sky-700',
    punto: 'bg-sky-500',
  },
  listos: {
    encabezado: 'bg-emerald-600 text-white',
    fondo: 'bg-emerald-500/[0.06]',
    borde: 'border-l-emerald-500',
    boton: 'bg-emerald-600 text-white hover:bg-emerald-700',
    punto: 'bg-emerald-500',
  },
};

export function etapaDe(estado: EstadoPedido): IdEtapa | null {
  return ETAPAS.find((e) => e.estados.includes(estado))?.id ?? null;
}

/** Hora actual que se actualiza sola (para "hace 7 min"). */
export function useAhora(intervaloMs = 30_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}

/** Un pedido nuevo sin aceptar después de estos minutos se marca en rojo. */
export const MINUTOS_ALERTA_SIN_ACEPTAR = 5;
