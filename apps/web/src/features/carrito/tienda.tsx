'use client';

/**
 * Contexto de la tienda: la carta (para recalcular precios en el cliente) y los datos del local que
 * necesitan el carrito y la hoja de producto. Lo monta la página con los datos ya cacheados.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  calcularItem,
  calcularItemPromo,
  ErrorPrecio,
  type ConfigPagos,
  type ConfigPedidos,
  type DatosHorario,
  type LineaCalculada,
} from '@app/shared';
import type { CategoriaPublica, ProductoPublico, PromoPublica } from '@/features/sitio/datos';
import { useCarrito, type LineaCarrito } from './store';

export interface DatosTienda {
  nombreLocal: string;
  whatsapp: string;
  horario: DatosHorario;
  pedidos: ConfigPedidos;
  pagos: ConfigPagos;
  categorias: CategoriaPublica[];
  productos: ProductoPublico[];
  promos: PromoPublica[];
}

interface ValorTienda extends DatosTienda {
  producto: (id: string) => ProductoPublico | undefined;
  promo: (id: string) => PromoPublica | undefined;
  categoria: (id: string) => CategoriaPublica | undefined;
}

const Contexto = createContext<ValorTienda | null>(null);

export function ProveedorTienda({ datos, children }: { datos: DatosTienda; children: ReactNode }) {
  // El carrito guardado se carga recién en el navegador (evita diferencias con el HTML estático).
  useEffect(() => {
    void useCarrito.persist.rehydrate();
  }, []);

  const valor = useMemo<ValorTienda>(() => {
    const productos = new Map(datos.productos.map((p) => [p.id, p]));
    const promos = new Map(datos.promos.map((p) => [p.id, p]));
    const categorias = new Map(datos.categorias.map((c) => [c.id, c]));
    return {
      ...datos,
      producto: (id) => productos.get(id),
      promo: (id) => promos.get(id),
      categoria: (id) => categorias.get(id),
    };
  }, [datos]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTienda(): ValorTienda {
  const v = useContext(Contexto);
  if (!v) throw new Error('useTienda() fuera de <ProveedorTienda>');
  return v;
}

export type LineaResuelta =
  | { clave: string; ok: true; linea: LineaCalculada }
  | { clave: string; ok: false; nombre: string; motivo: string };

/** Recalcula cada línea del carrito contra la carta actual (precio al día, agotados marcados). */
export function useLineasCarrito(): { lineas: LineaResuelta[]; total: number; cantidad: number } {
  const tienda = useTienda();
  const lineas = useCarrito((e) => e.lineas);

  return useMemo(() => {
    const resueltas = lineas.map((l: LineaCarrito): LineaResuelta => {
      const s = l.seleccion;
      const ref = s.tipo === 'producto' ? tienda.producto(s.productoId) : tienda.promo(s.promoId);
      const nombre = ref ? ('nombre' in ref ? ref.nombre : ref.titulo) : 'Producto';
      try {
        if (!ref) throw new ErrorPrecio('producto_inexistente', 'Ya no está en la carta');
        const linea =
          s.tipo === 'producto'
            ? calcularItem(ref as ProductoPublico, s)
            : calcularItemPromo(ref as PromoPublica, s);
        return { clave: l.clave, ok: true, linea };
      } catch (e) {
        return {
          clave: l.clave,
          ok: false,
          nombre,
          motivo: e instanceof Error ? e.message : 'No disponible',
        };
      }
    });
    const validas = resueltas.filter((r): r is Extract<LineaResuelta, { ok: true }> => r.ok);
    return {
      lineas: resueltas,
      total: validas.reduce((s, r) => s + r.linea.subtotal, 0),
      cantidad: validas.reduce((s, r) => s + r.linea.cantidad, 0),
    };
  }, [lineas, tienda]);
}
