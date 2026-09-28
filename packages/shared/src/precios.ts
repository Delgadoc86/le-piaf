/**
 * Cálculo de precios del pedido. Lo usan el carrito (para mostrar) y crearPedido (para cobrar).
 * El servidor SIEMPRE recalcula con esta misma función a partir de la base, nunca confía en el cliente.
 */
import type { Estacion } from './constantes.js';
import type { SeleccionItem } from './esquemas.js';
import type { ExtraItem, Producto, Promo } from './tipos.js';

export type CodigoErrorPrecio =
  | 'producto_inexistente'
  | 'producto_no_disponible'
  | 'promo_inexistente'
  | 'promo_no_disponible'
  | 'variante_requerida'
  | 'variante_inexistente'
  | 'grupo_inexistente'
  | 'opcion_inexistente'
  | 'opcion_no_disponible'
  | 'opcion_repetida'
  | 'extras_minimo'
  | 'extras_maximo'
  | 'cantidad_invalida'
  | 'descuento_invalido'
  | 'envio_invalido';

export class ErrorPrecio extends Error {
  constructor(
    readonly codigo: CodigoErrorPrecio,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorPrecio';
  }
}

export interface LineaCalculada {
  tipo: 'producto' | 'promo';
  /** productoId o promoId. */
  refId: string;
  nombre: string;
  varianteNombre?: string;
  extras: ExtraItem[];
  precioUnitario: number;
  cantidad: number;
  nota?: string;
  subtotal: number;
  estacion: Estacion;
}

export interface OpcionesCalculo {
  /** Si es true (default), rechaza productos/opciones agotados u ocultos. */
  validarDisponibilidad?: boolean;
}

type ProductoConId = Producto & { id: string };
type PromoConId = Promo & { id: string };
type SeleccionProducto = Extract<SeleccionItem, { tipo: 'producto' }>;
type SeleccionPromo = Extract<SeleccionItem, { tipo: 'promo' }>;

function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new ErrorPrecio('cantidad_invalida', 'La cantidad tiene que ser un entero mayor a 0');
  }
}

/** Calcula una línea de producto: variante + extras (respetando mín/máx de cada grupo) × cantidad. */
export function calcularItem(
  producto: ProductoConId,
  seleccion: Omit<SeleccionProducto, 'tipo' | 'productoId'>,
  opciones: OpcionesCalculo = {},
): LineaCalculada {
  const validarDisp = opciones.validarDisponibilidad ?? true;
  validarCantidad(seleccion.cantidad);

  if (validarDisp && (!producto.disponible || !producto.visible)) {
    throw new ErrorPrecio('producto_no_disponible', `"${producto.nombre}" no está disponible`);
  }

  // Precio base: variante (si el producto tiene) o precio del producto.
  let precioBase = producto.precio;
  let varianteNombre: string | undefined;
  const variantes = producto.variantes ?? [];
  if (variantes.length > 0) {
    if (!seleccion.varianteId) {
      throw new ErrorPrecio('variante_requerida', `Elegí una opción de "${producto.nombre}"`);
    }
    const variante = variantes.find((v) => v.id === seleccion.varianteId);
    if (!variante) throw new ErrorPrecio('variante_inexistente', 'La opción elegida ya no existe');
    precioBase = variante.precio;
    varianteNombre = variante.nombre;
  } else if (seleccion.varianteId) {
    throw new ErrorPrecio('variante_inexistente', 'La opción elegida ya no existe');
  }

  // Extras: cada opción debe existir, estar disponible y no repetirse; cada grupo respeta mín/máx.
  const grupos = producto.gruposExtras ?? [];
  const elegidos = seleccion.extras ?? [];
  const vistas = new Set<string>();
  const extras: ExtraItem[] = [];
  const cuentaPorGrupo = new Map<string, number>();

  for (const e of elegidos) {
    const grupo = grupos.find((g) => g.id === e.grupoId);
    if (!grupo) throw new ErrorPrecio('grupo_inexistente', 'Un grupo de extras ya no existe');
    const opcion = grupo.opciones.find((o) => o.id === e.opcionId);
    if (!opcion) throw new ErrorPrecio('opcion_inexistente', `Una opción de "${grupo.nombre}" ya no existe`);
    if (validarDisp && !opcion.disponible) {
      throw new ErrorPrecio('opcion_no_disponible', `"${opcion.nombre}" no está disponible`);
    }
    const clave = `${grupo.id}/${opcion.id}`;
    if (vistas.has(clave)) throw new ErrorPrecio('opcion_repetida', `"${opcion.nombre}" está repetida`);
    vistas.add(clave);
    cuentaPorGrupo.set(grupo.id, (cuentaPorGrupo.get(grupo.id) ?? 0) + 1);
    extras.push({ nombre: opcion.nombre, precio: opcion.precio });
  }

  for (const g of grupos) {
    const n = cuentaPorGrupo.get(g.id) ?? 0;
    if (n < g.min) throw new ErrorPrecio('extras_minimo', `Elegí al menos ${g.min} en "${g.nombre}"`);
    if (n > g.max) throw new ErrorPrecio('extras_maximo', `Podés elegir hasta ${g.max} en "${g.nombre}"`);
  }

  const precioUnitario = precioBase + extras.reduce((s, x) => s + x.precio, 0);
  const linea: LineaCalculada = {
    tipo: 'producto',
    refId: producto.id,
    nombre: producto.nombre,
    extras,
    precioUnitario,
    cantidad: seleccion.cantidad,
    subtotal: precioUnitario * seleccion.cantidad,
    estacion: producto.estacion,
  };
  if (varianteNombre !== undefined) linea.varianteNombre = varianteNombre;
  if (seleccion.nota) linea.nota = seleccion.nota;
  return linea;
}

/** Línea de promo: precio fijo × cantidad. La vigencia horaria se valida aparte. */
export function calcularItemPromo(
  promo: PromoConId,
  seleccion: Omit<SeleccionPromo, 'tipo' | 'promoId'>,
  opciones: OpcionesCalculo = {},
): LineaCalculada {
  validarCantidad(seleccion.cantidad);
  if ((opciones.validarDisponibilidad ?? true) && !promo.activa) {
    throw new ErrorPrecio('promo_no_disponible', `La promo "${promo.titulo}" no está disponible`);
  }
  const linea: LineaCalculada = {
    tipo: 'promo',
    refId: promo.id,
    nombre: promo.titulo,
    extras: [],
    precioUnitario: promo.precio,
    cantidad: seleccion.cantidad,
    subtotal: promo.precio * seleccion.cantidad,
    estacion: 'cocina',
  };
  if (seleccion.nota) linea.nota = seleccion.nota;
  return linea;
}

export interface Catalogo {
  productos: ReadonlyMap<string, ProductoConId>;
  promos: ReadonlyMap<string, PromoConId>;
}

export interface TotalesPedido {
  items: LineaCalculada[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
}

/** Calcula el pedido completo a partir de lo que eligió el cliente y del catálogo leído de la base. */
export function calcularPedido(
  selecciones: readonly SeleccionItem[],
  catalogo: Catalogo,
  extras: { costoEnvio?: number; descuento?: number } = {},
  opciones: OpcionesCalculo = {},
): TotalesPedido {
  const items = selecciones.map((sel) => {
    if (sel.tipo === 'producto') {
      const producto = catalogo.productos.get(sel.productoId);
      if (!producto) throw new ErrorPrecio('producto_inexistente', 'Un producto del carrito ya no existe');
      return calcularItem(producto, sel, opciones);
    }
    const promo = catalogo.promos.get(sel.promoId);
    if (!promo) throw new ErrorPrecio('promo_inexistente', 'Una promo del carrito ya no existe');
    return calcularItemPromo(promo, sel, opciones);
  });

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const costoEnvio = extras.costoEnvio ?? 0;
  const descuento = extras.descuento ?? 0;
  if (!Number.isInteger(costoEnvio) || costoEnvio < 0) {
    throw new ErrorPrecio('envio_invalido', 'Costo de envío inválido');
  }
  if (!Number.isInteger(descuento) || descuento < 0 || descuento > subtotal) {
    throw new ErrorPrecio('descuento_invalido', 'Descuento inválido');
  }
  return { items, subtotal, descuento, costoEnvio, total: subtotal - descuento + costoEnvio };
}
