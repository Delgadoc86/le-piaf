import { describe, expect, it } from 'vitest';
import { crearPedidoInputSchema, grupoExtrasSchema, productoSchema } from './esquemas.js';

describe('productoSchema', () => {
  const p = {
    categoriaId: 'c',
    nombre: 'X',
    descripcion: '',
    precio: 100,
    orden: 1,
    visible: true,
    disponible: true,
    estacion: 'cocina',
  };

  it('exige precios enteros', () => {
    expect(productoSchema.safeParse(p).success).toBe(true);
    expect(productoSchema.safeParse({ ...p, precio: 100.5 }).success).toBe(false);
    expect(productoSchema.safeParse({ ...p, precio: '100' }).success).toBe(false);
  });

  it('grupo de extras con min > max es inválido', () => {
    const g = { id: 'g', nombre: 'G', min: 3, max: 1, opciones: [{ id: 'o', nombre: 'O', precio: 0, disponible: true }] };
    expect(grupoExtrasSchema.safeParse(g).success).toBe(false);
  });
});

describe('crearPedidoInputSchema', () => {
  const pedido = {
    tipo: 'take_away',
    cliente: { nombre: 'Juan', telefono: '5492611234567' },
    items: [{ tipo: 'producto', productoId: 'hamburguesa', cantidad: 1 }],
    pago: { medio: 'efectivo', pagaCon: 10000 },
  };

  it('acepta un pedido válido y completa extras vacíos', () => {
    const r = crearPedidoInputSchema.parse(pedido);
    expect(r.items[0]).toMatchObject({ extras: [] });
  });

  it('delivery sin dirección es inválido', () => {
    expect(crearPedidoInputSchema.safeParse({ ...pedido, tipo: 'delivery' }).success).toBe(false);
  });

  it('no acepta pago con tarjeta desde la web', () => {
    expect(crearPedidoInputSchema.safeParse({ ...pedido, pago: { medio: 'tarjeta' } }).success).toBe(false);
  });

  it('descarta campos desconocidos, como precios mandados por el cliente', () => {
    const r = crearPedidoInputSchema.parse({ ...pedido, total: 1, items: [{ ...pedido.items[0], precio: 1 }] });
    expect(r).not.toHaveProperty('total');
    expect(r.items[0]).not.toHaveProperty('precio');
  });
});
