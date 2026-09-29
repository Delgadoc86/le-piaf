/**
 * Tipos de los documentos de Firestore (§5 del ROADMAP).
 * Los datos editables se infieren de los esquemas zod; acá se suman los campos que pone el servidor.
 */
import type {
  CategoriaMovimiento,
  Estacion,
  EstadoCocina,
  EstadoPago,
  EstadoPagoPedido,
  EstadoPedido,
  MedioPago,
  MedioPagoManual,
  OrigenPedido,
  Rol,
  TipoPedido,
} from './constantes.js';
import type {
  CategoriaDatos,
  ConfigPedidos,
  LocalEditable,
  MesaDatos,
  ProductoDatos,
  PromoDatos,
  ZonaDeliveryDatos,
} from './esquemas.js';

/** Compatible con el Timestamp del SDK cliente y del Admin SDK, sin depender de ninguno. */
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

/** Documento con su id (lo que devuelven los hooks y servicios). */
export type ConId<T> = T & { id: string };

// ─── Sesión ──────────────────────────────────────────────────────────────────

/** Perfil técnico del usuario. Solo lo escriben las Functions. */
export interface Usuario {
  email: string;
  nombre: string;
  /** Se incrementa cuando cambian los claims; el cliente refresca el token. */
  claimsVersion?: number;
}

/** Custom claims del token (§6): el rol del usuario en el local. */
export interface ClaimsLocal {
  rol?: Rol;
}

// ─── Local ───────────────────────────────────────────────────────────────────

/** Documento local/datos. */
export type Local = Omit<LocalEditable, 'pedidos'> & {
  pedidos: ConfigPedidos & { pausadoHasta?: Timestamp };
  actualizadoEn: Timestamp;
};

/** miembros/{uid} */
export interface Miembro {
  rol: Rol;
  nombre: string;
  email: string;
  activo: boolean;
  creadoEn: Timestamp;
}

export interface MercadoPagoPrivado {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiraEn: Timestamp;
}

export type Categoria = CategoriaDatos;
export type Producto = ProductoDatos & { actualizadoEn?: Timestamp };
export type Promo = PromoDatos;
export type ZonaDelivery = ZonaDeliveryDatos;

export type Mesa = MesaDatos & {
  pedidoActualId?: string;
  /** Rota al cerrar la mesa. */
  qrToken: string;
};

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export interface ExtraItem {
  nombre: string;
  precio: number;
}

export interface ItemPedido {
  id: string;
  tipo: 'producto' | 'promo';
  /** productoId o promoId según el tipo. */
  productoId: string;
  nombre: string;
  varianteNombre?: string;
  extras: ExtraItem[];
  precioUnitario: number;
  cantidad: number;
  nota?: string;
  subtotal: number;
  estacion: Estacion;
  ronda: number;
  estadoCocina: EstadoCocina;
}

export interface PagoPedido {
  medio: MedioPago;
  monto: number;
  estado: EstadoPago;
  mpPaymentId?: string;
  pagaCon?: number;
  /** Quién registró el cobro (cobros manuales desde el panel). */
  porUid?: string;
}

export interface Pedido {
  numero: number;
  /** Jornada del local (YYYY-MM-DD, corta a HORA_CORTE_JORNADA) a la que pertenece el número. */
  jornada: string;
  tipo: TipoPedido;
  origen: OrigenPedido;
  estado: EstadoPedido;
  cliente?: { nombre: string; telefono?: string };
  entrega?: { direccion: string; referencia?: string; zonaId?: string; costo: number };
  /** Cómo dijo el cliente que va a pagar. Lo cobrado de verdad está en `pagos`. */
  pagoElegido: { medio: MedioPagoManual; pagaCon?: number };
  nota?: string;
  mesaId?: string;
  mozoUid?: string;
  comensales?: number;
  items: ItemPedido[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  pagos: PagoPedido[];
  estadoPago: EstadoPagoPedido;
  turnoCajaId?: string;
  tiempoEstimadoMin?: number;
  motivoCancelacion?: string;
  seguimientoToken: string;
  /** Candado de contabilizarPedido: true si ya está sumado en la caja y en statsDiarias. */
  contabilizado: boolean;
  /** Qué se sumó y dónde, para poder restarlo igual si se cancela o se deshace el cobro. */
  contabilizacion?: {
    turnoCajaId: string | null;
    total: number;
    porMedio: Record<MedioPagoManual, number>;
    hora: string;
  };
  historial: { estado: EstadoPedido; en: Timestamp; porUid?: string }[];
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Espejo público mínimo del pedido (/pedido/[token]). Sin teléfono ni dirección: el token viaja
 * en un link que el cliente puede reenviar.
 */
export interface Seguimiento {
  numero: number;
  estado: EstadoPedido;
  tipo: TipoPedido;
  tiempoEstimadoMin?: number;
  motivoCancelacion?: string;
  items: { nombre: string; cantidad: number }[];
  total: number;
  /** Delivery: 0 mientras el local no confirma el envío. */
  costoEnvio?: number;
  medioPago: MedioPagoManual;
  estadoPago: EstadoPagoPedido;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  localNombre: string;
}

export interface Contador {
  ultimoNumero: number;
}

export interface Cliente {
  nombre: string;
  telefono: string;
  direcciones: string[];
  cantidadPedidos: number;
  totalGastado: number;
  ultimoPedido: Timestamp;
}

// ─── Caja y stats ────────────────────────────────────────────────────────────

export interface TurnoCaja {
  estado: 'abierto' | 'cerrado';
  abiertoPor: string;
  abiertoPorNombre: string;
  abiertoEn: Timestamp;
  montoInicial: number;
  /** Cobros de pedidos pagados mientras la caja estuvo abierta (lo suma contabilizarPedido). */
  totales: Record<MedioPagoManual, number>;
  cantidadPedidos: number;
  cerradoPor?: string;
  cerradoPorNombre?: string;
  cerradoEn?: Timestamp;
  /** Foto del cierre: lo que tenía que haber, lo contado y la diferencia (contado − esperado). */
  esperado?: Record<MedioPagoManual, number>;
  contado?: Record<MedioPagoManual, number>;
  diferencia?: Record<MedioPagoManual, number>;
  movimientosNeto?: number;
  notas?: string;
}

export interface MovimientoCaja {
  tipo: 'ingreso' | 'egreso';
  categoria: CategoriaMovimiento;
  monto: number;
  detalle: string;
  porUid: string;
  en: Timestamp;
}

/** statsDiarias/{jornada}: ventas cobradas de la jornada (solo pedidos pagados y no anulados). */
export interface StatsDiarias {
  jornada: string;
  ventas: number;
  pedidos: number;
  porTipo: Partial<Record<TipoPedido, { ventas: number; pedidos: number }>>;
  porMedio: Partial<Record<MedioPagoManual, number>>;
  /** Hora local de creación del pedido ("00".."23"). */
  porHora: Record<string, { ventas: number; pedidos: number }>;
  porProducto: Record<string, { nombre: string; cantidad: number; ventas: number }>;
}

export interface Auditoria {
  accion: string;
  detalle: Record<string, unknown>;
  porUid: string;
  en: Timestamp;
}
