'use client';

/**
 * Carrito (zustand, persistido en el navegador). Guarda SOLO la selección del cliente
 * (qué producto, variante, extras, cantidad): los precios se recalculan siempre desde la carta
 * con calcularPedido (packages/shared), igual que hará crearPedido en el servidor.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SeleccionItem } from '@app/shared';

export interface LineaCarrito {
  clave: string;
  seleccion: SeleccionItem;
}

/** Misma elección (sin contar la cantidad) = misma línea: se suman las cantidades. */
function claveDe(s: SeleccionItem): string {
  if (s.tipo === 'promo') return `promo:${s.promoId}:${s.nota ?? ''}`;
  const extras = [...s.extras]
    .map((e) => `${e.grupoId}.${e.opcionId}`)
    .sort()
    .join(',');
  return `prod:${s.productoId}:${s.varianteId ?? ''}:${extras}:${s.nota ?? ''}`;
}

interface EstadoCarrito {
  lineas: LineaCarrito[];
  agregar: (s: SeleccionItem) => void;
  cambiarCantidad: (clave: string, cantidad: number) => void;
  quitar: (clave: string) => void;
  vaciar: () => void;
}

export const useCarrito = create<EstadoCarrito>()(
  persist(
    (set) => ({
      lineas: [],
      agregar: (s) =>
        set((e) => {
          const clave = claveDe(s);
          const existente = e.lineas.find((l) => l.clave === clave);
          if (!existente) return { lineas: [...e.lineas, { clave, seleccion: s }] };
          return {
            lineas: e.lineas.map((l) =>
              l.clave === clave
                ? {
                    ...l,
                    seleccion: {
                      ...l.seleccion,
                      cantidad: Math.min(99, l.seleccion.cantidad + s.cantidad),
                    },
                  }
                : l,
            ),
          };
        }),
      cambiarCantidad: (clave, cantidad) =>
        set((e) => ({
          lineas:
            cantidad <= 0
              ? e.lineas.filter((l) => l.clave !== clave)
              : e.lineas.map((l) =>
                  l.clave === clave
                    ? { ...l, seleccion: { ...l.seleccion, cantidad: Math.min(99, cantidad) } }
                    : l,
                ),
        })),
      quitar: (clave) => set((e) => ({ lineas: e.lineas.filter((l) => l.clave !== clave) })),
      vaciar: () => set({ lineas: [] }),
    }),
    // skipHydration: se rehidrata después de montar (ProveedorTienda) para no desentonar con el HTML del servidor.
    { name: 'carrito-v1', skipHydration: true, partialize: (e) => ({ lineas: e.lineas }) },
  ),
);

/** Estado de la interfaz de la tienda (no se persiste). */
interface EstadoUI {
  producto: string | null;
  carritoAbierto: boolean;
  /** Se incrementa en cada agregado: dispara la animación del contador. */
  pulso: number;
  abrirProducto: (id: string | null) => void;
  abrirCarrito: (abierto: boolean) => void;
  avisarAgregado: () => void;
}

export const useTiendaUI = create<EstadoUI>()((set) => ({
  producto: null,
  carritoAbierto: false,
  pulso: 0,
  abrirProducto: (producto) => set({ producto }),
  abrirCarrito: (carritoAbierto) => set({ carritoAbierto, producto: null }),
  avisarAgregado: () => set((e) => ({ pulso: e.pulso + 1 })),
}));
