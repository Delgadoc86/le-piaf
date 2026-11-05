import { describe, expect, it } from 'vitest';
import {
  calcularUnidadesCupo,
  correspondeRestituirCupo,
  itemAgotadoPorCupo,
  pesoCupoProducto,
  pesoCupoPromo,
  type CatalogoCupo,
} from './cupo.js';
import type { ConfigCupoTurno } from './esquemas.js';

const configPizzas: ConfigCupoTurno = {
  habilitado: true,
  nombreItem: 'Pizzas',
  cantidadPorDefecto: 50,
  categoriaIds: ['pizzas', 'calzones'],
  pausarAlAgotar: true,
};

const catalogo: CatalogoCupo = {
  productos: new Map([
    ['muzza', { categoriaId: 'pizzas' }], // default 1
    ['especial-gigante', { categoriaId: 'pizzas', pesoCupo: 2 }], // doble bollos
    ['empanada-docena', { categoriaId: 'pizzas', pesoCupo: 0 }], // en categoría pero exento
    ['coca-15', { categoriaId: 'bebidas' }], // otra categoría = 0
  ]),
  promos: new Map([
    ['promo-2-muzzas', { pesoCupo: 2 }],
    ['promo-bebidas', {}], // default 0
  ]),
};

describe('Cupo del Turno (cálculo puro)', () => {
  it('asigna peso 1 por defecto a productos de categorías alcanzadas y 0 al resto', () => {
    expect(pesoCupoProducto({ categoriaId: 'pizzas' }, configPizzas)).toBe(1);
    expect(pesoCupoProducto({ categoriaId: 'pizzas', pesoCupo: 2 }, configPizzas)).toBe(2);
    expect(pesoCupoProducto({ categoriaId: 'pizzas', pesoCupo: 0 }, configPizzas)).toBe(0);
    expect(pesoCupoProducto({ categoriaId: 'bebidas' }, configPizzas)).toBe(0);
    expect(
      pesoCupoProducto({ categoriaId: 'pizzas' }, { ...configPizzas, habilitado: false }),
    ).toBe(0);
  });

  it('asigna peso explícito a promos y 0 cuando no lo definen', () => {
    expect(pesoCupoPromo({ pesoCupo: 2 }, configPizzas)).toBe(2);
    expect(pesoCupoPromo({}, configPizzas)).toBe(0);
    expect(pesoCupoPromo({ pesoCupo: 3 }, { ...configPizzas, habilitado: false })).toBe(0);
  });

  it('suma correctamente productos con peso default, peso custom y promos en un pedido', () => {
    const total = calcularUnidadesCupo(
      [
        { tipo: 'producto', productoId: 'muzza', extras: [], cantidad: 2 }, // 2 * 1 = 2
        { tipo: 'producto', productoId: 'especial-gigante', extras: [], cantidad: 1 }, // 1 * 2 = 2
        { tipo: 'producto', productoId: 'coca-15', extras: [], cantidad: 3 }, // 0
        { tipo: 'promo', promoId: 'promo-2-muzzas', cantidad: 2 }, // 2 * 2 = 4
        { tipo: 'promo', promoId: 'promo-bebidas', cantidad: 1 }, // 0
      ],
      catalogo,
      configPizzas,
    );
    expect(total).toBe(8);
  });

  it('devuelve 0 si el cupo está deshabilitado', () => {
    const total = calcularUnidadesCupo(
      [{ tipo: 'producto', productoId: 'muzza', extras: [], cantidad: 3 }],
      catalogo,
      { ...configPizzas, habilitado: false },
    );
    expect(total).toBe(0);
  });
});

describe('Restitución e idempotencia del cupo', () => {
  it('restituye cuando pasa de pendiente o aceptado a cancelado o rechazado', () => {
    expect(
      correspondeRestituirCupo(
        { estado: 'pendiente', unidadesCupo: 3 },
        { estado: 'rechazado', unidadesCupo: 3 },
      ),
    ).toBe(true);
    expect(
      correspondeRestituirCupo(
        { estado: 'aceptado', unidadesCupo: 2 },
        { estado: 'cancelado', unidadesCupo: 2 },
      ),
    ).toBe(true);
  });

  it('no restituye si ya estaba en preparación o listo (mercadería ya cocinada)', () => {
    expect(
      correspondeRestituirCupo(
        { estado: 'en_preparacion', unidadesCupo: 2 },
        { estado: 'cancelado', unidadesCupo: 2 },
      ),
    ).toBe(false);
    expect(
      correspondeRestituirCupo(
        { estado: 'listo', unidadesCupo: 2 },
        { estado: 'cancelado', unidadesCupo: 2 },
      ),
    ).toBe(false);
  });

  it('es idempotente si cupoRestituido ya es true o si unidadesCupo es 0', () => {
    expect(
      correspondeRestituirCupo(
        { estado: 'pendiente', unidadesCupo: 3, cupoRestituido: true },
        { estado: 'cancelado', unidadesCupo: 3, cupoRestituido: true },
      ),
    ).toBe(false);
    expect(
      correspondeRestituirCupo(
        { estado: 'pendiente', unidadesCupo: 0 },
        { estado: 'cancelado', unidadesCupo: 0 },
      ),
    ).toBe(false);
  });
});

describe('Disponibilidad en tienda web según cupo', () => {
  it('marca agotado cuando restante es menor al peso requerido por el producto o promo', () => {
    expect(
      itemAgotadoPorCupo(
        { tipo: 'producto', producto: { categoriaId: 'pizzas' } },
        configPizzas,
        { restante: 0 },
      ),
    ).toBe(true);
    expect(
      itemAgotadoPorCupo(
        { tipo: 'promo', promo: { pesoCupo: 2 } },
        configPizzas,
        { restante: 1 },
      ),
    ).toBe(true);
    expect(
      itemAgotadoPorCupo(
        { tipo: 'promo', promo: { pesoCupo: 2 } },
        configPizzas,
        { restante: 2 },
      ),
    ).toBe(false);
    expect(
      itemAgotadoPorCupo(
        { tipo: 'producto', producto: { categoriaId: 'bebidas' } },
        configPizzas,
        { restante: 0 },
      ),
    ).toBe(false);
  });
});

