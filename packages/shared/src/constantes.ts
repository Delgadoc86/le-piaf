/** Constantes del dominio. Los tipos se derivan de estos arrays para no duplicar listas. */

/**
 * Documento único con los datos del local. Cada repo es UN local (ROADMAP §3):
 * no hay locales/{id}; todo lo demás cuelga de la raíz de Firestore.
 */
export const DOC_LOCAL = 'local/datos';

/** Carpeta de Storage para las imágenes públicas del local. */
export const CARPETA_IMAGENES = 'imagenes';

export const ROLES = ['dueno', 'encargado', 'mozo', 'cocina'] as const;
export type Rol = (typeof ROLES)[number];

export const ROLES_GESTORES: readonly Rol[] = ['dueno', 'encargado'];

export const TIPOS_PEDIDO = ['take_away', 'delivery', 'salon'] as const;
export type TipoPedido = (typeof TIPOS_PEDIDO)[number];

export const ORIGENES_PEDIDO = ['web', 'qr_mesa', 'mozo', 'mostrador', 'telefono'] as const;
export type OrigenPedido = (typeof ORIGENES_PEDIDO)[number];

export const ESTADOS_PEDIDO = [
  // web / qr / mostrador
  'pendiente',
  'aceptado',
  'en_preparacion',
  'listo',
  'en_camino',
  'entregado',
  'rechazado',
  'cancelado',
  // salón (mozo)
  'abierto',
  'cuenta_pedida',
  'cerrado',
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

/** Estados en los que el pedido sigue "vivo" (lo que escucha el panel en tiempo real). */
export const ESTADOS_PEDIDO_ACTIVOS: readonly EstadoPedido[] = [
  'pendiente',
  'aceptado',
  'en_preparacion',
  'listo',
  'en_camino',
  'abierto',
  'cuenta_pedida',
];

export const ESTADOS_PEDIDO_FINALES: readonly EstadoPedido[] = [
  'entregado',
  'rechazado',
  'cancelado',
  'cerrado',
];

export const MEDIOS_PAGO = ['efectivo', 'transferencia', 'mercadopago', 'tarjeta'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export const ESTADOS_PAGO = ['pendiente', 'aprobado', 'rechazado'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ESTADOS_PAGO_PEDIDO = ['pendiente', 'parcial', 'pagado'] as const;
export type EstadoPagoPedido = (typeof ESTADOS_PAGO_PEDIDO)[number];

export const ESTACIONES = ['cocina', 'barra'] as const;
export type Estacion = (typeof ESTACIONES)[number];

export const ESTADOS_COCINA = ['pendiente', 'preparando', 'listo'] as const;
export type EstadoCocina = (typeof ESTADOS_COCINA)[number];

export const ETIQUETAS_PRODUCTO = [
  'nuevo',
  'picante',
  'vegetariano',
  'sin_tacc',
  'recomendado',
] as const;
export type EtiquetaProducto = (typeof ETIQUETAS_PRODUCTO)[number];

export const ESTADOS_MESA = ['libre', 'ocupada', 'cuenta'] as const;
export type EstadoMesa = (typeof ESTADOS_MESA)[number];

export const SECCIONES_WEB = ['hero', 'promos', 'carta', 'nosotros', 'galeria', 'ubicacion'] as const;
export type SeccionWeb = (typeof SECCIONES_WEB)[number];

/** Lista curada de fuentes (§11). Se precargan con next/font. */
export const FUENTES = [
  'Sriracha',
  'Bebas Neue',
  'Poppins',
  'Playfair Display',
  'Oswald',
  'Roboto',
  'Inter',
  'Montserrat',
] as const;
export type FuenteId = (typeof FUENTES)[number];

export const CATEGORIAS_MOVIMIENTO = ['proveedor', 'cambio', 'retiro', 'otro'] as const;
export type CategoriaMovimiento = (typeof CATEGORIAS_MOVIMIENTO)[number];

/** Límites de una línea de pedido. */
export const CANTIDAD_MAXIMA_ITEM = 99;
export const ITEMS_MAXIMOS_PEDIDO = 50;
