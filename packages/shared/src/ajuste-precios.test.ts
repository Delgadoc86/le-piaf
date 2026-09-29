import { describe, expect, it } from 'vitest';
import { ajustePreciosInputSchema, planAjuste } from './ajuste-precios.js';

const productos = [
  { id: 'hamb', categoriaId: 'hamburguesas', precio: 9000 },
  {
    id: 'mila',
    categoriaId: 'lomos',
    precio: 12000,
    variantes: [
      { id: 'napo', nombre: 'Napo', precio: 12000 },
      { id: 'caba', nombre: 'Caballo', precio: 12500 },
    ],
  },
  { id: 'cons', categoriaId: 'lomos', precio: 0 },
];

const input = (extra: object) =>
  ajustePreciosInputSchema.parse({
    alcance: 'todo',
    ajuste: { tipo: 'porcentaje', valor: 10 },
    multiplo: 100,
    ...extra,
  });

describe('planAjuste', () => {
  it('ajusta precio y variantes, con redondeo', () => {
    const plan = planAjuste(productos, input({}));
    expect(plan.find((c) => c.id === 'hamb')?.despues.precio).toBe(9900);
    expect(plan.find((c) => c.id === 'mila')?.despues.variantes.map((v) => v.precio)).toEqual([
      13200, 13800,
    ]);
  });

  it('no toca los precios en 0 ("Consultar") y los deja fuera del plan', () => {
    expect(planAjuste(productos, input({})).some((c) => c.id === 'cons')).toBe(false);
  });

  it('respeta el alcance por categoría y por producto', () => {
    expect(
      planAjuste(productos, input({ alcance: 'categorias', ids: ['lomos'] })).map((c) => c.id),
    ).toEqual(['mila']);
    expect(
      planAjuste(productos, input({ alcance: 'productos', ids: ['hamb'] })).map((c) => c.id),
    ).toEqual(['hamb']);
  });

  it('monto fijo y redondeo hacia arriba', () => {
    const plan = planAjuste(
      productos,
      input({ ajuste: { tipo: 'monto', valor: 730 }, multiplo: 500, modo: 'arriba' }),
    );
    expect(plan.find((c) => c.id === 'hamb')?.despues.precio).toBe(10000);
  });
});

describe('ajustePreciosInputSchema', () => {
  it('exige elegir algo si el alcance no es "todo"', () => {
    const r = ajustePreciosInputSchema.safeParse({
      alcance: 'categorias',
      ids: [],
      ajuste: { tipo: 'monto', valor: 100 },
      multiplo: 1,
    });
    expect(r.success).toBe(false);
  });
  it('no permite bajar más de 90 %', () => {
    const r = ajustePreciosInputSchema.safeParse({
      alcance: 'todo',
      ajuste: { tipo: 'porcentaje', valor: -95 },
      multiplo: 1,
    });
    expect(r.success).toBe(false);
  });
});
