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
  MEDIOS_PAGO,
  REGEX_SLUG,
  ROLES,
  SECCIONES_WEB,
  SLUGS_RESERVADOS,
  TIPOS_PEDIDO,
  VARIANTES_ESTILO,
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

export const slugSchema = z
  .string()
  .regex(REGEX_SLUG, 'Solo minúsculas, números y guiones (3 a 40)')
  .refine((s) => !(SLUGS_RESERVADOS as readonly string[]).includes(s), 'Ese nombre está reservado');

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

export const estiloWebSchema = z.object({
  hero: z.enum(VARIANTES_ESTILO.hero),
  promos: z.enum(VARIANTES_ESTILO.promos),
  carta: z.enum(VARIANTES_ESTILO.carta),
  nosotros: z.enum(VARIANTES_ESTILO.nosotros),
  bordes: z.enum(VARIANTES_ESTILO.bordes),
  titulosSeccion: z.enum(VARIANTES_ESTILO.titulosSeccion),
  separadores: z.enum(VARIANTES_ESTILO.separadores),
  botones: z.enum(VARIANTES_ESTILO.botones),
});

export const webSchema = z.object({
  secciones: z.array(
    z.object({ tipo: z.enum(SECCIONES_WEB), visible: z.boolean(), orden: z.number().int() }),
  ),
  estilo: estiloWebSchema,
  hero: z.object({ bajada: z.string().max(80), titulo: z.string().max(80), textoBoton: z.string().max(40) }),
  nosotros: z.object({
    titulo: z.string().max(80),
    parrafos: z.array(textoLargo).max(10),
    fotoUrl: z.string(),
    frase: z.string().max(200),
    tarjetas: z
      .array(z.object({ icono: z.string().max(40), titulo: z.string().max(60), texto: z.string().max(200) }))
      .max(8),
    cierre: z.string().max(400),
  }),
  galeria: z.array(z.object({ fotoUrl: z.string(), titulo: z.string().max(60) })).max(24),
  notaCarta: z.string().max(400).optional(),
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
    cbu: z.string().regex(/^\d{22}$/).optional(),
    titular: z.string().max(80),
  }),
  mercadoPago: z.object({ habilitado: z.boolean(), conectado: z.boolean() }),
});

/** Campos del local que edita el dueño desde el panel (sin suscripción, slug ni dueño). */
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
  .refine((g) => g.min <= g.max, { message: 'El mínimo no puede superar al máximo', path: ['min'] });

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
    .array(z.object({ productoId: idSchema, varianteId: idSchema.optional(), cantidad: z.number().int().min(1) }))
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

export const crearLocalInputSchema = z.object({
  slug: slugSchema,
  nombre: textoCorto,
  zonaHoraria: z.string().min(1).optional(),
});

export const invitarMiembroInputSchema = z.object({
  localId: idSchema,
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
    extras: z.array(z.object({ grupoId: idSchema, opcionId: idSchema })).max(30).default([]),
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

export const crearPedidoInputSchema = z
  .object({
    localId: idSchema,
    tipo: z.enum(TIPOS_PEDIDO),
    cliente: z.object({ nombre: z.string().trim().min(2).max(60), telefono: telefonoSchema }),
    entrega: z
      .object({
        direccion: z.string().trim().min(3).max(200),
        referencia: z.string().trim().max(200).optional(),
        zonaId: idSchema,
      })
      .optional(),
    mesa: z.object({ mesaId: idSchema, qrToken: z.string().min(8).max(64) }).optional(),
    items: z.array(seleccionItemSchema).min(1).max(ITEMS_MAXIMOS_PEDIDO),
    pago: z.object({
      medio: z.enum(MEDIOS_PAGO).exclude(['tarjeta']),
      pagaCon: pesosSchema.optional(),
    }),
  })
  .refine((p) => p.tipo !== 'delivery' || p.entrega !== undefined, {
    message: 'Falta la dirección de entrega',
    path: ['entrega'],
  });

// ─── Tipos inferidos ─────────────────────────────────────────────────────────

export type Horario = z.infer<typeof horarioSchema>;
export type CierreEspecial = z.infer<typeof cierreEspecialSchema>;
export type Contacto = z.infer<typeof contactoSchema>;
export type Direccion = z.infer<typeof direccionSchema>;
export type Marca = z.infer<typeof marcaSchema>;
export type ContenidoWeb = z.infer<typeof webSchema>;
export type EstiloWebDatos = z.infer<typeof estiloWebSchema>;
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
export type CrearLocalInput = z.infer<typeof crearLocalInputSchema>;
export type InvitarMiembroInput = z.infer<typeof invitarMiembroInputSchema>;
export type SeleccionItem = z.infer<typeof seleccionItemSchema>;
export type CrearPedidoInput = z.infer<typeof crearPedidoInputSchema>;
