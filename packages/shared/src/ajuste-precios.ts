/**
 * Actualización masiva de precios (Fase 1). La misma función arma la vista previa en el panel
 * y la aplica la Function ajustarPrecios: lo que el dueño ve es lo que se guarda.
 */
import { z } from 'zod';
import {
  aplicarAjuste,
  MULTIPLOS_REDONDEO,
  type ModoRedondeo,
  type MultiploRedondeo,
} from './dinero.js';
import type { ProductoDatos } from './esquemas.js';

export const ajustePreciosInputSchema = z
  .object({
    alcance: z.enum(['todo', 'categorias', 'productos']),
    ids: z.array(z.string().min(1).max(64)).max(1000).default([]),
    ajuste: z.discriminatedUnion('tipo', [
      z.object({ tipo: z.literal('porcentaje'), valor: z.number().min(-90).max(500) }),
      z.object({
        tipo: z.literal('monto'),
        valor: z.number().int().min(-1_000_000).max(1_000_000),
      }),
    ]),
    multiplo: z.union(
      MULTIPLOS_REDONDEO.map((m) => z.literal(m)) as [
        z.ZodLiteral<1>,
        ...z.ZodLiteral<MultiploRedondeo>[],
      ],
    ),
    modo: z.enum(['cercano', 'arriba', 'abajo']).default('cercano'),
  })
  .refine((d) => d.alcance === 'todo' || d.ids.length > 0, {
    message: 'Elegí al menos uno',
    path: ['ids'],
  });

export type AjustePreciosInput = z.infer<typeof ajustePreciosInputSchema>;

type ConPrecios = Pick<ProductoDatos, 'precio' | 'variantes'> & { id: string; categoriaId: string };

/** ¿El producto entra en el alcance elegido? */
export function entraEnAlcance(
  p: ConPrecios,
  input: Pick<AjustePreciosInput, 'alcance' | 'ids'>,
): boolean {
  if (input.alcance === 'todo') return true;
  if (input.alcance === 'categorias') return input.ids.includes(p.categoriaId);
  return input.ids.includes(p.id);
}

export interface CambioPrecio {
  id: string;
  antes: { precio: number; variantes: { id: string; precio: number }[] };
  despues: { precio: number; variantes: { id: string; nombre: string; precio: number }[] };
}

/** Nuevo precio del producto y de cada variante. Los precios en 0 ("Consultar") no se tocan. */
export function ajustarProducto(p: ConPrecios, input: AjustePreciosInput): CambioPrecio {
  const ajustar = (precio: number) =>
    precio === 0
      ? 0
      : aplicarAjuste(precio, input.ajuste, input.multiplo, input.modo as ModoRedondeo);
  const variantes = p.variantes ?? [];
  return {
    id: p.id,
    antes: { precio: p.precio, variantes: variantes.map((v) => ({ id: v.id, precio: v.precio })) },
    despues: {
      precio: ajustar(p.precio),
      variantes: variantes.map((v) => ({ ...v, precio: ajustar(v.precio) })),
    },
  };
}

/** Vista previa / plan completo: solo los productos que cambian. */
export function planAjuste(
  productos: readonly ConPrecios[],
  input: AjustePreciosInput,
): CambioPrecio[] {
  return productos
    .filter((p) => entraEnAlcance(p, input))
    .map((p) => ajustarProducto(p, input))
    .filter(
      (c) =>
        c.antes.precio !== c.despues.precio ||
        c.antes.variantes.some((v, i) => v.precio !== c.despues.variantes[i]?.precio),
    );
}
