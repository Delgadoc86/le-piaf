'use client';

/**
 * Pedidos en el panel: escucha la jornada en tiempo real y aplica los cambios que permite
 * firestore.rules (estado, historial, demora, cobros). Crear pedidos siempre pasa por crearPedido.
 */
import { useEffect, useRef, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  claveJornada,
  formatARS,
  estadoPagoDe,
  inicioJornada,
  totalConEnvio,
  type Bloqueo,
  type Cobro,
  type CrearPedidoInput,
  type EstadoPedido,
  type PagoPedido,
  type Pedido,
  type Rol,
  type TipoPedido,
} from '@app/shared';
import { firebase } from '@/lib/firebase/client';
import { sonarPedidoNuevo } from './sonido';

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
  // Último pedido nuevo que canceló el cliente o que venció sin confirmar (para avisarle al local).
  const [cancelacion, setCancelacion] = useState<{
    id: string;
    numero: number;
    por: 'cliente' | 'vencido';
  } | null>(null);
  const estadosPrevios = useRef<Map<string, string> | null>(null);

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
      (snap) => {
        const pedidos = snap.docs.map((d) => ({ ...(d.data() as Pedido), id: d.id }));
        const previos = estadosPrevios.current;
        if (previos) {
          for (const p of pedidos) {
            const por = p.canceladoPor;
            if (
              previos.get(p.id) === 'pendiente' &&
              p.estado === 'cancelado' &&
              (por === 'cliente' || por === 'vencido')
            ) {
              setCancelacion({ id: p.id, numero: p.numero, por });
            }
          }
        }
        estadosPrevios.current = new Map(pedidos.map((p) => [p.id, p.estado]));
        setEstado({ pedidos, cargando: false, error: null });
      },
      (e) => setEstado((s) => ({ ...s, cargando: false, error: e.message })),
    );
  }, [zonaHoraria, jornada]);

  return { ...estado, jornada, cancelacion };
}

/**
 * Alerta global en tiempo real de pedidos pendientes (nuevos) en la jornada actual.
 * Detecta cuando entra un pedido web o externo y dispara el timbre si el usuario está en otra pantalla.
 */
export function useAlertaPedidosPendientes(zonaHoraria: string | undefined, rutaActual?: string) {
  const [nuevosCount, setNuevosCount] = useState(0);
  const prevCount = useRef<number | null>(null);

  useEffect(() => {
    if (!zonaHoraria) return;
    const desde = Timestamp.fromDate(inicioJornada(new Date(), zonaHoraria));
    const q = query(
      collection(firebase().db, 'pedidos'),
      where('estado', '==', 'pendiente'),
      where('creadoEn', '>=', desde),
      orderBy('creadoEn', 'desc'),
    );

    return onSnapshot(
      q,
      (snap) => {
        const count = snap.size;
        setNuevosCount(count);

        // Si la cantidad aumentó y no estamos directamente en la pantalla de pedidos:
        if (prevCount.current !== null && count > prevCount.current) {
          if (rutaActual !== '/panel/pedidos') {
            sonarPedidoNuevo();
          }
        }
        prevCount.current = count;
      },
      () => {
        // En caso de corte de red momentáneo, silenciar
      },
    );
  }, [zonaHoraria, rutaActual]);

  // Si hay pedidos pendientes y estamos en otra pantalla, actualizar el título de la pestaña del navegador
  useEffect(() => {
    if (nuevosCount > 0 && rutaActual !== '/panel/pedidos') {
      const prevTitle = document.title;
      document.title = `(${nuevosCount}) 🔔 Pedidos nuevos`;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [nuevosCount, rutaActual]);

  return nuevosCount;
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
    // Lo canceló o rechazó el local (el cliente y el vencimiento los marca el servidor).
    ...(estado === 'cancelado' || estado === 'rechazado' ? { canceladoPor: 'local' } : {}),
    actualizadoEn: serverTimestamp(),
  });
}

export function cambiarDemora(pedido: PedidoConId, minutos: number) {
  return updateDoc(refPedido(pedido.id), {
    tiempoEstimadoMin: Math.max(0, Math.min(300, minutos)),
    actualizadoEn: serverTimestamp(),
  });
}

/** Llegó el WhatsApp del cliente nuevo: el pedido queda confirmado (ya no vence). */
export function confirmarPedido(pedido: PedidoConId) {
  return updateDoc(refPedido(pedido.id), {
    porConfirmar: false,
    confirmarAntesDe: deleteField(),
    actualizadoEn: serverTimestamp(),
  });
}

/** El número no puede volver a pedir por la web (lo revisa crearPedido). */
export function bloquearNumero(telefono: string, motivo: string, uid: string) {
  return setDoc(doc(firebase().db, 'bloqueados', telefono), {
    telefono,
    motivo: motivo.trim().slice(0, 120),
    porUid: uid,
    en: serverTimestamp(),
  });
}

export function desbloquearNumero(telefono: string) {
  return deleteDoc(doc(firebase().db, 'bloqueados', telefono));
}

/** Números bloqueados (solo dueño y encargado los pueden leer). */
export function useBloqueados() {
  const [lista, setLista] = useState<(Bloqueo & { id: string })[]>([]);
  useEffect(
    () =>
      onSnapshot(
        query(collection(firebase().db, 'bloqueados'), orderBy('en', 'desc')),
        (snap) => setLista(snap.docs.map((d) => ({ ...(d.data() as Bloqueo), id: d.id }))),
        () => setLista([]),
      ),
    [],
  );
  return lista;
}

/** Delivery: el local confirma el costo del envío y se recalcula el total (y el estado del pago). */
export function cambiarEnvio(pedido: PedidoConId, costoEnvio: number) {
  const total = totalConEnvio(pedido, costoEnvio);
  return updateDoc(refPedido(pedido.id), {
    costoEnvio,
    total,
    estadoPago: estadoPagoDe(pedido.pagos, total),
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
        pedido.tipo === 'delivery' && pedido.costoEnvio > 0
          ? ` Llegamos a tu zona: el envío cuesta ${formatARS(pedido.costoEnvio)} y el total queda en ${formatARS(pedido.total)}.`
          : ''
      }${pedido.tiempoEstimadoMin ? ` Demora aprox.: ${pedido.tiempoEstimadoMin} min.` : ''}`;
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
    titulo: 'Nuevos (Aceptar)',
    corto: 'Nuevos',
    estados: ['pendiente', 'aceptado'],
    vacio: 'Sin pedidos nuevos. Cuando entre uno nuevo, suena el timbre y entra acá.',
  },
  {
    id: 'preparacion',
    titulo: 'En Cocina (Preparando)',
    corto: 'En Cocina',
    estados: ['en_preparacion'],
    vacio: 'Nada en la plancha ni en preparación.',
  },
  {
    id: 'listos',
    titulo: 'Listos para Despacho',
    corto: 'Listos',
    estados: ['listo', 'en_camino'],
    vacio: 'Nada esperando entrega en mostrador.',
  },
];

export const COLOR_ETAPA: Record<
  IdEtapa,
  { encabezado: string; fondo: string; borde: string; boton: string; punto: string; textoBoton: string }
> = {
  nuevos: {
    encabezado: 'bg-amber-500 text-slate-950 font-black',
    fondo: 'bg-amber-50/70',
    borde: 'border-2 border-amber-400 shadow-sm shadow-amber-500/10',
    boton: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md',
    punto: 'bg-amber-500',
    textoBoton: 'Aceptar Pedido',
  },
  preparacion: {
    encabezado: 'bg-blue-600 text-white font-black',
    fondo: 'bg-blue-50/70',
    borde: 'border-2 border-blue-400 shadow-sm shadow-blue-500/10',
    boton: 'bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md',
    punto: 'bg-blue-500',
    textoBoton: '¡Marcar Plato Listo!',
  },
  listos: {
    encabezado: 'bg-emerald-600 text-white font-black',
    fondo: 'bg-emerald-50/70',
    borde: 'border-2 border-emerald-400 shadow-sm shadow-emerald-500/10',
    boton: 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md',
    punto: 'bg-emerald-500',
    textoBoton: 'Entregar Pedido',
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
