import { describe, expect, it } from 'vitest';
import { calcularItem, calcularPedido, ErrorPrecio, type Catalogo } from './precios.js';
import type { Producto, Promo } from './tipos.js';

const base: Producto & { id: string } = {
  id: 'hamburguesa',
  categoriaId: 'hamburguesas',
  nombre: 'Hamburguesa XL',
  descripcion: '',
  precio: 9000,
  orden: 1,
  visible: true,
  disponible: true,
  estacion: 'cocina',
};

const milanesa: Producto & { id: string } = {
  ...base,
  id: 'mila',
  nombre: 'Milanesa al plato',
  precio: 0,
  variantes: [
    { id: 'napo', nombre: 'Napolitana', precio: 12000 },
    { id: 'caballo', nombre: 'A caballo', precio: 12500 },
  ],
  gruposExtras: [
    {
      id: 'guarnicion',
      nombre: 'Guarnición',
      min: 1,
      max: 1,
      opciones: [
        { id: 'papas', nombre: 'Papas fritas', precio: 0, disponible: true },
        { id: 'pure', nombre: 'Puré', precio: 500, disponible: true },
        { id: 'ensalada', nombre: 'Ensalada', precio: 300, disponible: false },
      ],
    },
    {
      id: 'agregados',
      nombre: 'Agregados',
      min: 0,
      max: 2,
      opciones: [
        { id: 'huevo', nombre: 'Huevo extra', precio: 800, disponible: true },
        { id: 'cheddar', nombre: 'Cheddar', precio: 1000, disponible: true },
        { id: 'bacon', nombre: 'Bacon', precio: 1200, disponible: true },
      ],
    },
  ],
};

const promo: Promo & { id: string } = {
  id: 'lomo-papas',
  titulo: 'Lomo + papas',
  descripcion: '',
  precio: 14000,
  orden: 1,
  activa: true,
};

/** Ejecuta fn y devuelve el código de ErrorPrecio que tira (o null si no tira). */
function codigo(fn: () => unknown): string | null {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorPrecio) return e.codigo;
    throw e;
  }
  return null;
}

type Extra = { grupoId: string; opcionId: string };
const mila = (extras: Extra[], varianteId = 'napo') => () =>
  calcularItem(milanesa, { varianteId, extras, cantidad: 1 });
const papas: Extra = { grupoId: 'guarnicion', opcionId: 'papas' };

describe('calcularItem', () => {
  it('producto simple', () => {
    const l = calcularItem(base, { extras: [], cantidad: 2 });
    expect(l).toMatchObject({ precioUnitario: 9000, subtotal: 18000, estacion: 'cocina', extras: [] });
  });

  it('variante + extras', () => {
    const l = calcularItem(milanesa, {
      varianteId: 'caballo',
      extras: [
        { grupoId: 'guarnicion', opcionId: 'pure' },
        { grupoId: 'agregados', opcionId: 'cheddar' },
      ],
      cantidad: 3,
      nota: 'sin sal',
    });
    expect(l.varianteNombre).toBe('A caballo');
    expect(l.precioUnitario).toBe(12500 + 500 + 1000);
    expect(l.subtotal).toBe(14000 * 3);
    expect(l.nota).toBe('sin sal');
  });

  it('valida la variante', () => {
    expect(codigo(() => calcularItem(milanesa, { extras: [papas], cantidad: 1 }))).toBe('variante_requerida');
    expect(codigo(mila([papas], 'x'))).toBe('variante_inexistente');
    expect(codigo(() => calcularItem(base, { varianteId: 'napo', extras: [], cantidad: 1 }))).toBe(
      'variante_inexistente',
    );
  });

  it('respeta mínimo y máximo de extras', () => {
    expect(codigo(mila([]))).toBe('extras_minimo');
    expect(codigo(mila([papas, { grupoId: 'guarnicion', opcionId: 'pure' }]))).toBe('extras_maximo');
    expect(
      codigo(
        mila([
          papas,
          { grupoId: 'agregados', opcionId: 'huevo' },
          { grupoId: 'agregados', opcionId: 'cheddar' },
          { grupoId: 'agregados', opcionId: 'bacon' },
        ]),
      ),
    ).toBe('extras_maximo');
  });

  it('valida las opciones elegidas', () => {
    const huevo: Extra = { grupoId: 'agregados', opcionId: 'huevo' };
    expect(codigo(mila([papas, huevo, huevo]))).toBe('opcion_repetida');
    expect(codigo(mila([{ grupoId: 'guarnicion', opcionId: 'ensalada' }]))).toBe('opcion_no_disponible');
    expect(codigo(mila([{ grupoId: 'guarnicion', opcionId: 'nada' }]))).toBe('opcion_inexistente');
    expect(codigo(mila([{ grupoId: 'nada', opcionId: 'papas' }]))).toBe('grupo_inexistente');
  });

  it('rechaza agotados, ocultos y cantidades inválidas', () => {
    const agotado = { ...base, disponible: false };
    expect(codigo(() => calcularItem(agotado, { extras: [], cantidad: 1 }))).toBe('producto_no_disponible');
    expect(codigo(() => calcularItem({ ...base, visible: false }, { extras: [], cantidad: 1 }))).toBe(
      'producto_no_disponible',
    );
    const sinValidar = calcularItem(agotado, { extras: [], cantidad: 1 }, { validarDisponibilidad: false });
    expect(sinValidar.subtotal).toBe(9000);
    expect(codigo(() => calcularItem(base, { extras: [], cantidad: 0 }))).toBe('cantidad_invalida');
    expect(codigo(() => calcularItem(base, { extras: [], cantidad: 1.5 }))).toBe('cantidad_invalida');
  });
});

describe('calcularPedido', () => {
  const catalogo: Catalogo = {
    productos: new Map([
      [base.id, base],
      [milanesa.id, milanesa],
    ]),
    promos: new Map([[promo.id, promo]]),
  };
  const unaHamburguesa = [{ tipo: 'producto' as const, productoId: 'hamburguesa', extras: [], cantidad: 1 }];

  it('suma ítems, envío y descuento', () => {
    const r = calcularPedido(
      [
        { tipo: 'producto', productoId: 'hamburguesa', extras: [], cantidad: 2 },
        { tipo: 'promo', promoId: 'lomo-papas', cantidad: 1 },
      ],
      catalogo,
      { costoEnvio: 1500, descuento: 2000 },
    );
    expect(r.subtotal).toBe(18000 + 14000);
    expect(r.total).toBe(32000 - 2000 + 1500);
    expect(r.items).toHaveLength(2);
    expect(r.items[1]).toMatchObject({ tipo: 'promo', refId: 'lomo-papas', subtotal: 14000 });
  });

  it('ignora cualquier precio que mande el cliente: solo usa el catálogo', () => {
    const trucho = { ...unaHamburguesa[0], precio: 1 } as never;
    expect(calcularPedido([trucho], catalogo).total).toBe(9000);
  });

  it('errores de catálogo', () => {
    expect(
      codigo(() => calcularPedido([{ tipo: 'producto', productoId: 'x', extras: [], cantidad: 1 }], catalogo)),
    ).toBe('producto_inexistente');
    expect(codigo(() => calcularPedido([{ tipo: 'promo', promoId: 'x', cantidad: 1 }], catalogo))).toBe(
      'promo_inexistente',
    );
    const promoInactiva: Catalogo = { ...catalogo, promos: new Map([[promo.id, { ...promo, activa: false }]]) };
    expect(codigo(() => calcularPedido([{ tipo: 'promo', promoId: promo.id, cantidad: 1 }], promoInactiva))).toBe(
      'promo_no_disponible',
    );
  });

  it('errores de montos', () => {
    expect(codigo(() => calcularPedido(unaHamburguesa, catalogo, { descuento: 9001 }))).toBe('descuento_invalido');
    expect(codigo(() => calcularPedido(unaHamburguesa, catalogo, { costoEnvio: -1 }))).toBe('envio_invalido');
    expect(codigo(() => calcularPedido(unaHamburguesa, catalogo, { costoEnvio: 10.5 }))).toBe('envio_invalido');
  });
});
