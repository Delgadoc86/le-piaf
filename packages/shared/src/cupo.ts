/**
 * Motor puro del Cupo del Turno (stock operativo simple: ej. "50 Pizzas", "40 Lomos").
 * Sin dependencias de Firebase: se ejecuta idéntico en Cloud Functions, panel y tienda web.
 */
import type {
  ConfigCupoTurno,
  ProductoDatos,
  PromoDatos,
  SeleccionItem,
} from './esquemas.js';
import type { CupoTurnoActivo, Pedido } from './tipos.js';

export type ProductoParaCupo = Pick<ProductoDatos, 'categoriaId' | 'pesoCupo'>;
export type PromoParaCupo = Pick<PromoDatos, 'pesoCupo'>;

export interface CatalogoCupo {
  productos: ReadonlyMap<string, ProductoParaCupo>;
  promos: ReadonlyMap<string, PromoParaCupo>;
}

/**
 * Unidades de cupo que consume 1 unidad de este producto.
 * Si pertenece a una de las categorías configuradas y no define `pesoCupo`, por defecto vale 1.
 */
export function pesoCupoProducto(
  producto: ProductoParaCupo,
  config?: ConfigCupoTurno | null,
): number {
  if (!config || !config.habilitado) return 0;
  if (!config.categoriaIds.includes(producto.categoriaId)) return 0;
  const peso = producto.pesoCupo ?? 1;
  return peso > 0 ? Math.trunc(peso) : 0;
}

/**
 * Unidades de cupo que consume 1 unidad de esta promoción.
 * Por defecto vale 0 salvo que la promo defina explícitamente `pesoCupo` (ej. Promo 2 Pizzas = 2).
 */
export function pesoCupoPromo(promo: PromoParaCupo, config?: ConfigCupoTurno | null): number {
  if (!config || !config.habilitado) return 0;
  const peso = promo.pesoCupo ?? 0;
  return peso > 0 ? Math.trunc(peso) : 0;
}

/**
 * Calcula el total de unidades de cupo que demanda una lista de ítems seleccionados.
 */
export function calcularUnidadesCupo(
  items: readonly SeleccionItem[],
  catalogo: CatalogoCupo,
  config?: ConfigCupoTurno | null,
): number {
  if (!config || !config.habilitado || items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    if (item.cantidad <= 0) continue;
    if (item.tipo === 'producto') {
      const prod = catalogo.productos.get(item.productoId);
      if (!prod) continue;
      total += item.cantidad * pesoCupoProducto(prod, config);
    } else {
      const promo = catalogo.promos.get(item.promoId);
      if (!promo) continue;
      total += item.cantidad * pesoCupoPromo(promo, config);
    }
  }
  return total;
}

/**
 * Determina si corresponde restituir automáticamente las unidades al cupo activo cuando cambia un pedido.
 * Solo devuelve cupo cuando el pedido tenía `unidadesCupo > 0`, no fue restituido antes,
 * y pasa desde `pendiente` o `aceptado` (antes de entrar en cocción) a `cancelado` o `rechazado`.
 */
export function correspondeRestituirCupo(
  antes: Pick<Pedido, 'estado' | 'unidadesCupo' | 'cupoRestituido'>,
  despues: Pick<Pedido, 'estado' | 'unidadesCupo' | 'cupoRestituido'>,
): boolean {
  const unidades = despues.unidadesCupo ?? antes.unidadesCupo ?? 0;
  if (unidades <= 0) return false;
  if (antes.cupoRestituido === true || despues.cupoRestituido === true) return false;

  const estabaSinCocinar = antes.estado === 'pendiente' || antes.estado === 'aceptado';
  const pasoAAnulado = despues.estado === 'cancelado' || despues.estado === 'rechazado';
  return estabaSinCocinar && pasoAAnulado;
}

/**
 * Indica si un producto o promoción debe mostrarse como "Agotado por hoy" en la tienda web pública
 * a raíz del cupo del turno activo.
 */
export function itemAgotadoPorCupo(
  item:
    | { tipo: 'producto'; producto: ProductoParaCupo }
    | { tipo: 'promo'; promo: PromoParaCupo },
  config?: ConfigCupoTurno | null,
  cupoActivo?: Pick<CupoTurnoActivo, 'restante'> | null,
): boolean {
  if (!config || !config.habilitado || !config.pausarAlAgotar || !cupoActivo) return false;
  const peso =
    item.tipo === 'producto'
      ? pesoCupoProducto(item.producto, config)
      : pesoCupoPromo(item.promo, config);
  if (peso <= 0) return false;
  return cupoActivo.restante < peso;
}

