/**
 * Esquemas zod del dominio. Se usan igual en el front (formularios) y en las Functions.
 * Los timestamps de Firestore no se validan acá: los pone el servidor.
 */
import { z } from 'zod';
import {
  ESTACIONES,
  ETIQUETAS_PRODUCTO,
  ESTADOS_MESA,
  FUENTES,
  CATEGORIAS_MOVIMIENTO,
  MEDIOS_PAGO_MANUALES,
  ORIGENES_MANUALES,
  ROLES,
  SECCIONES_WEB,
  TIPOS_PEDIDO,
  CANTIDAD_MAXIMA_ITEM,
  ITEMS_MAXIMOS_PEDIDO,
} from './constantes.js';

// ─── Primitivos ──────────────────────────────────────────────────────────────

/** Pesos enteros, sin decimales. */
export const pesosSchema = z.number().int().nonnegative();

export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm');

export const fechaDiaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD');

/** 0 = domingo … 6 = sábado (igual que Date#getDay). */
export const diaSemanaSchema = z.number().int().min(0).max(6);

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex #rrggbb');

export const idSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Id inválido');

/** Teléfono normalizado: solo dígitos, con código de país (ej. 5492616367525). */
export const telefonoSchema = z.string().regex(/^\d{8,15}$/, 'Solo números, con código de área');

const textoCorto = z.string().trim().min(1).max(80);
const textoLargo = z.string().trim().max(1000);
const urlOpcional = z.url().optional();

// ─── Local ───────────────────────────────────────────────────────────────────

export const horarioSchema = z.object({
  dias: z.array(diaSemanaSchema).min(1),
  desde: horaSchema,
  /** Si "hasta" <= "desde", el turno cruza la medianoche. */
  hasta: horaSchema,
});

export const cierreEspecialSchema = z.object({
  fecha: fechaDiaSchema,
  motivo: z.string().trim().max(120),
});

export const contactoSchema = z.object({
  whatsapp: telefonoSchema,
  telefono: z.string().optional(),
  email: z.email().optional(),
  instagram: urlOpcional,
  facebook: urlOpcional,
  tiktok: urlOpcional,
});

export const direccionSchema = z.object({
  calle: textoCorto,
  localidad: textoCorto,
  departamento: z.string().trim().max(80),
  provincia: textoCorto,
  cp: z.string().trim().max(10),
  pais: z.string().length(2),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  googleMapsUrl: z.url(),
});

export const marcaSchema = z.object({
  colorPrimario: colorSchema,
  colorPrimarioHover: colorSchema,
  colorFondo: colorSchema,
  colorSuperficie: colorSchema,
  colorTexto: colorSchema,
  colorTextoSecundario: colorSchema,
  fuenteTitulos: z.enum(FUENTES),
  fuenteTexto: z.enum(FUENTES),
  logoUrl: z.string(),
  faviconUrl: z.string(),
  ogImageUrl: z.string(),
  heroDesktopUrl: z.string(),
  heroMovilUrl: z.string(),
});

export const webSchema = z.object({
  secciones: z.array(
    z.object({ tipo: z.enum(SECCIONES_WEB), visible: z.boolean(), orden: z.number().int() }),
  ),
  hero: z.object({
    bajada: z.string().max(80),
    titulo: z.string().max(80),
    textoBoton: z.string().max(40),
  }),
  nosotros: z.object({
    titulo: z.string().max(80),
    parrafos: z.array(textoLargo).max(10),
    fotoUrl: z.string(),
    frase: z.string().max(200),
    tarjetas: z
      .array(
        z.object({
          icono: z.string().max(40),
          titulo: z.string().max(60),
          texto: z.string().max(200),
        }),
      )
      .max(8),
    cierre: z.string().max(400),
  }),
  galeria: z.array(z.object({ fotoUrl: z.string(), titulo: z.string().max(60) })).max(24),
  notaCarta: z.string().max(400).optional(),
  /** Mensaje con el que se abre WhatsApp desde el botón flotante. */
  mensajeWhatsApp: z.string().trim().max(200).optional(),
  seo: z.object({
    titulo: z.string().max(120),
    descripcion: z.string().max(300),
    keywords: z.array(z.string().max(60)).max(20),
  }),
  ga4Id: z
    .string()
    .regex(/^G-[A-Z0-9]+$/)
    .optional(),
});

export const configPedidosSchema = z.object({
  habilitados: z.boolean(),
  tipos: z.object({ takeAway: z.boolean(), delivery: z.boolean(), salon: z.boolean() }),
  tiempoEstimadoMin: z.number().int().min(0).max(300),
  pedidoMinimo: pesosSchema,
  requiereConfirmacionMozoQR: z.boolean(),
  mensajeCerrado: z.string().max(200).optional(),
});

export const configPagosSchema = z.object({
  efectivo: z.boolean(),
  transferencia: z.object({
    habilitado: z.boolean(),
    alias: z.string().max(40),
    cbu: z
      .string()
      .regex(/^\d{22}$/)
      .optional(),
    titular: z.string().max(80),
  }),
  mercadoPago: z.object({ habilitado: z.boolean() }),
});

/**
 * Banner de fecha especial (Día del Padre, Mundial, aniversario…): va debajo de la portada,
 * con una imagen para computadora y otra para celular, y solo se ve entre "desde" y "hasta".
 */
export const bannerSchema = z
  .object({
    activo: z.boolean(),
    imagenPcUrl: z.string(),
    imagenMovilUrl: z.string(),
    /** Texto alternativo (accesibilidad y SEO): qué dice el banner. */
    alt: z.string().trim().max(160),
    desde: fechaDiaSchema.optional(),
    hasta: fechaDiaSchema.optional(),
  })
  .refine((b) => !b.activo || (b.imagenPcUrl && b.imagenMovilUrl), {
    message: 'Subí las dos imágenes (computadora y celular)',
    path: ['imagenPcUrl'],
  })
  .refine((b) => !b.desde || !b.hasta || b.desde <= b.hasta, {
    message: 'La fecha de fin tiene que ser igual o posterior a la de inicio',
    path: ['hasta'],
  });

/** Datos del local (documento local/datos). */
export const localEditableSchema = z.object({
  nombre: textoCorto,
  nombreCorto: z.string().trim().min(1).max(30),
  bajada: z.string().max(80).optional(),
  descripcionCorta: z.string().max(200),
  activo: z.boolean(),
  zonaHoraria: z.string().min(1),
  contacto: contactoSchema,
  direccion: direccionSchema,
  horarios: z.array(horarioSchema),
  cierresEspeciales: z.array(cierreEspecialSchema).optional(),
  marca: marcaSchema,
  web: webSchema,
  pedidos: configPedidosSchema,
  pagos: configPagosSchema,
  banner: bannerSchema.optional(),
});

// ─── Carta ───────────────────────────────────────────────────────────────────

export const categoriaSchema = z.object({
  nombre: textoCorto,
  orden: z.number().int(),
  visible: z.boolean(),
  icono: z.string().max(40).optional(),
  descripcion: z.string().max(300).optional(),
});

export const varianteSchema = z.object({
  id: idSchema,
  nombre: textoCorto,
  precio: pesosSchema,
});

export const opcionExtraSchema = z.object({
  id: idSchema,
  nombre: textoCorto,
  precio: pesosSchema,
  disponible: z.boolean(),
});

export const grupoExtrasSchema = z
  .object({
    id: idSchema,
    nombre: textoCorto,
    min: z.number().int().min(0),
    max: z.number().int().min(1),
    opciones: z.array(opcionExtraSchema).min(1),
  })
  .refine((g) => g.min <= g.max, {
    message: 'El mínimo no puede superar al máximo',
    path: ['min'],
  });

export const productoSchema = z.object({
  categoriaId: idSchema,
  nombre: textoCorto,
  descripcion: z.string().max(500),
  precio: pesosSchema,
  fotoUrl: z.string().optional(),
  orden: z.number().int(),
  visible: z.boolean(),
  /** false = "Agotado". */
  disponible: z.boolean(),
  diasDisponible: z.array(diaSemanaSchema).optional(),
  estacion: z.enum(ESTACIONES),
  etiquetas: z.array(z.enum(ETIQUETAS_PRODUCTO)).optional(),
  /** Si existen, reemplazan a "precio". */
  variantes: z.array(varianteSchema).optional(),
  gruposExtras: z.array(grupoExtrasSchema).optional(),
});

export const promoSchema = z.object({
  titulo: textoCorto,
  descripcion: z.string().max(500),
  precio: pesosSchema,
  fotoUrl: z.string().optional(),
  orden: z.number().int(),
  activa: z.boolean(),
  items: z
    .array(
      z.object({
        productoId: idSchema,
        varianteId: idSchema.optional(),
        cantidad: z.number().int().min(1),
      }),
    )
    .optional(),
  vigencia: z
    .object({
      dias: z.array(diaSemanaSchema),
      desde: horaSchema.optional(),
      hasta: horaSchema.optional(),
      fechaFin: fechaDiaSchema.optional(),
    })
    .optional(),
});

export const zonaDeliverySchema = z.object({
  nombre: textoCorto,
  costo: pesosSchema,
  pedidoMinimo: pesosSchema.optional(),
  activa: z.boolean(),
  orden: z.number().int(),
});

export const mesaSchema = z.object({
  nombre: textoCorto,
  sector: z.string().trim().min(1).max(40),
  capacidad: z.number().int().min(1).max(50),
  orden: z.number().int(),
  estado: z.enum(ESTADOS_MESA),
});

// ─── Inputs de Functions ─────────────────────────────────────────────────────

export const invitarMiembroInputSchema = z.object({
  email: z.email(),
  nombre: textoCorto,
  rol: z.enum(ROLES),
});

/** Lo que el cliente elige para una línea del carrito. Los precios NO vienen del cliente. */
export const seleccionItemSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('producto'),
    productoId: idSchema,
    varianteId: idSchema.optional(),
    extras: z
      .array(z.object({ grupoId: idSchema, opcionId: idSchema }))
      .max(30)
      .default([]),
    cantidad: z.number().int().min(1).max(CANTIDAD_MAXIMA_ITEM),
    nota: z.string().trim().max(200).optional(),
  }),
  z.object({
    tipo: z.literal('promo'),
    promoId: idSchema,
    cantidad: z.number().int().min(1).max(CANTIDAD_MAXIMA_ITEM),
    nota: z.string().trim().max(200).optional(),
  }),
]);

/**
 * Input de crearPedido. Lo usan la web (origen "web": nombre y teléfono obligatorios) y el panel
 * (origen "mostrador" o "telefono": cliente opcional y se puede registrar el pago en el momento).
 * Nunca lleva precios: el servidor los recalcula desde la base.
 */
export const crearPedidoInputSchema = z
  .object({
    origen: z.enum(['web', ...ORIGENES_MANUALES]).default('web'),
    tipo: z.enum(TIPOS_PEDIDO),
    cliente: z
      .object({
        nombre: z.string().trim().max(60),
        telefono: telefonoSchema.optional(),
      })
      .optional(),
    entrega: z
      .object({
        direccion: z.string().trim().min(3).max(200),
        referencia: z.string().trim().max(200).optional(),
        /** Opcional mientras no haya zonas con costo: el envío se arregla con el local. */
        zonaId: idSchema.optional(),
      })
      .optional(),
    mesa: z.object({ mesaId: idSchema, qrToken: z.string().min(8).max(64) }).optional(),
    items: z.array(seleccionItemSchema).min(1).max(ITEMS_MAXIMOS_PEDIDO),
    pago: z.object({
      medio: z.enum(MEDIOS_PAGO_MANUALES),
      pagaCon: pesosSchema.optional(),
    }),
    nota: z.string().trim().max(200).optional(),
    /** Solo staff: el cliente ya pagó (se registra el cobro por el total). */
    pagado: z.boolean().optional(),
  })
  .refine((p) => p.origen !== 'web' || (p.cliente?.nombre.length ?? 0) >= 2, {
    message: 'Falta tu nombre',
    path: ['cliente', 'nombre'],
  })
  .refine((p) => p.origen !== 'web' || p.cliente?.telefono !== undefined, {
    message: 'Falta tu teléfono',
    path: ['cliente', 'telefono'],
  })
  .refine((p) => p.origen !== 'web' || !p.pagado, {
    message: 'Solo el local registra pagos',
    path: ['pagado'],
  })
  .refine((p) => p.tipo !== 'delivery' || p.entrega !== undefined, {
    message: 'Falta la dirección de entrega',
    path: ['entrega'],
  });

// ─── Caja ────────────────────────────────────────────────────────────────────

export const abrirCajaInputSchema = z.object({ montoInicial: pesosSchema.max(100_000_000) });

export const cerrarCajaInputSchema = z.object({
  contado: z.object({ efectivo: pesosSchema, transferencia: pesosSchema }),
  notas: z.string().trim().max(500).optional(),
});

/** Ingreso o egreso de efectivo anotado en la caja abierta (lo escribe el panel; ver reglas). */
export const movimientoCajaSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  categoria: z.enum(CATEGORIAS_MOVIMIENTO),
  monto: pesosSchema.min(1),
  detalle: z.string().trim().max(200),
});

/** Cobro manual que registra el staff desde el panel. */
export const cobroSchema = z.object({
  medio: z.enum(MEDIOS_PAGO_MANUALES),
  monto: pesosSchema.min(1),
});

// ─── Tipos inferidos ─────────────────────────────────────────────────────────

export type Horario = z.infer<typeof horarioSchema>;
export type CierreEspecial = z.infer<typeof cierreEspecialSchema>;
export type Contacto = z.infer<typeof contactoSchema>;
export type Direccion = z.infer<typeof direccionSchema>;
export type Marca = z.infer<typeof marcaSchema>;
export type ContenidoWeb = z.infer<typeof webSchema>;
export type Banner = z.infer<typeof bannerSchema>;
export type ConfigPedidos = z.infer<typeof configPedidosSchema>;
export type ConfigPagos = z.infer<typeof configPagosSchema>;
export type LocalEditable = z.infer<typeof localEditableSchema>;
export type CategoriaDatos = z.infer<typeof categoriaSchema>;
export type Variante = z.infer<typeof varianteSchema>;
export type OpcionExtra = z.infer<typeof opcionExtraSchema>;
export type GrupoExtras = z.infer<typeof grupoExtrasSchema>;
export type ProductoDatos = z.infer<typeof productoSchema>;
export type PromoDatos = z.infer<typeof promoSchema>;
export type ZonaDeliveryDatos = z.infer<typeof zonaDeliverySchema>;
export type MesaDatos = z.infer<typeof mesaSchema>;
export type InvitarMiembroInput = z.infer<typeof invitarMiembroInputSchema>;
export type SeleccionItem = z.infer<typeof seleccionItemSchema>;
/** Lo que se manda a crearPedido (origen y extras con default). */
export type CrearPedidoInput = z.input<typeof crearPedidoInputSchema>;
/** Lo que queda después de validar. */
export type CrearPedidoDatos = z.infer<typeof crearPedidoInputSchema>;
export type Cobro = z.infer<typeof cobroSchema>;
export type AbrirCajaInput = z.infer<typeof abrirCajaInputSchema>;
export type CerrarCajaInput = z.infer<typeof cerrarCajaInputSchema>;
export type MovimientoCajaDatos = z.infer<typeof movimientoCajaSchema>;
