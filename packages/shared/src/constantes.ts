/** Constantes del dominio. Los tipos se derivan de estos arrays para no duplicar listas. */

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

/** Variantes de diseño de la web pública (§11 "Diseño por local"). El primer valor es el default. */
export const VARIANTES_ESTILO = {
  hero: ['pantalla_completa', 'partido', 'compacto'],
  promos: ['carrusel', 'grilla'],
  carta: ['lista', 'tarjetas', 'fotos'],
  nosotros: ['clasico', 'destacado'],
  bordes: ['redondeado', 'recto', 'pill'],
  titulosSeccion: ['simple', 'overline'],
  separadores: ['ninguno', 'linea', 'degradado'],
  botones: ['solido', 'contorno', 'pulso'],
} as const;
export type EstiloWeb = { [K in keyof typeof VARIANTES_ESTILO]: (typeof VARIANTES_ESTILO)[K][number] };

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

export const PLANES = ['carta', 'pedidos', 'completo'] as const;
export type PlanId = (typeof PLANES)[number];

export const ESTADOS_SUSCRIPCION = ['prueba', 'activa', 'en_mora', 'suspendida', 'cancelada'] as const;
export type EstadoSuscripcion = (typeof ESTADOS_SUSCRIPCION)[number];

export const CATEGORIAS_MOVIMIENTO = ['proveedor', 'cambio', 'retiro', 'otro'] as const;
export type CategoriaMovimiento = (typeof CATEGORIAS_MOVIMIENTO)[number];

export const ZONA_HORARIA_DEFAULT = 'America/Argentina/Mendoza';

/** Slug: minúsculas, números y guiones; 3 a 40 caracteres; sin guion al inicio ni al final. */
export const REGEX_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Slugs que chocan con rutas de la app y no se pueden usar para un local. */
export const SLUGS_RESERVADOS = [
  'admin',
  'api',
  'panel',
  'login',
  'registro',
  'ayuda',
  'precios',
  'terminos',
  'privacidad',
  '_next',
] as const;

export const DIAS_PRUEBA_DEFAULT = 14;

/** Límites de una línea de pedido. */
export const CANTIDAD_MAXIMA_ITEM = 99;
export const ITEMS_MAXIMOS_PEDIDO = 50;
