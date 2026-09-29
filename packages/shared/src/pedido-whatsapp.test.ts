import { describe, expect, it } from 'vitest';
import { mensajePedidoWhatsApp } from './pedido-whatsapp.js';
import type { TotalesPedido } from './precios.js';

const totales: TotalesPedido = {
  items: [
    {
      tipo: 'producto',
      refId: 'mila',
      nombre: 'Milanesa al plato',
      varianteNombre: 'Napolitana',
      extras: [{ nombre: 'Huevo extra', precio: 800 }],
      precioUnitario: 12800,
      cantidad: 2,
      nota: 'sin sal',
      subtotal: 25600,
      estacion: 'cocina',
    },
    {
      tipo: 'promo',
      refId: 'lomo',
      nombre: 'Lomo + papas',
      extras: [],
      precioUnitario: 14000,
      cantidad: 1,
      subtotal: 14000,
      estacion: 'cocina',
    },
  ],
  subtotal: 39600,
  descuento: 0,
  costoEnvio: 0,
  total: 39600,
};

const limpiar = (s: string) => s.replace(/\s/g, ' ');

describe('mensajePedidoWhatsApp', () => {
  it('arma el detalle con variantes, extras, notas y total', () => {
    const m = limpiar(
      mensajePedidoWhatsApp('Silverio', totales, {
        nombre: 'Juan',
        tipo: 'take_away',
        pago: 'efectivo',
      }),
    );
    expect(m).toContain('¡Hola Silverio!');
    expect(m).toContain('• 2× Milanesa al plato (Napolitana) — $ 25.600');
    expect(m).toContain('+ Huevo extra');
    expect(m).toContain('Nota: sin sal');
    expect(m).toContain('• 1× Promo Lomo + papas — $ 14.000');
    expect(m).toContain('*Total: $ 39.600*');
    expect(m).toContain('Retiro en el local');
    expect(m).toContain('👤 Juan');
  });

  it('delivery con dirección, envío y vuelto', () => {
    const conEnvio = { ...totales, costoEnvio: 1500, total: 41100 };
    const m = limpiar(
      mensajePedidoWhatsApp('Silverio', conEnvio, {
        nombre: 'Ana',
        tipo: 'delivery',
        direccion: 'San Martín 123',
        referencia: 'portón verde',
        pago: 'efectivo',
        pagaCon: 50000,
      }),
    );
    expect(m).toContain('Envío: $ 1.500');
    expect(m).toContain('Delivery: San Martín 123 (portón verde)');
    expect(m).toContain('Efectivo (pago con $ 50.000)');
  });

  it('no menciona el vuelto si no hace falta', () => {
    const m = mensajePedidoWhatsApp('Silverio', totales, {
      nombre: 'A',
      tipo: 'take_away',
      pago: 'efectivo',
      pagaCon: 1000,
    });
    expect(m).not.toContain('pago con');
  });
});
