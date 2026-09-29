import { describe, expect, it } from 'vitest';
import {
  aportePedido,
  debeContabilizarse,
  diferenciaCaja,
  esperadoCaja,
  ticketPromedio,
} from './caja.js';
import type { ItemPedido, PagoPedido } from './tipos.js';

const item = (productoId: string, cantidad: number, subtotal: number): ItemPedido => ({
  id: productoId,
  tipo: 'producto',
  productoId,
  nombre: productoId,
  extras: [],
  precioUnitario: subtotal / cantidad,
  cantidad,
  subtotal,
  estacion: 'cocina',
  ronda: 1,
  estadoCocina: 'pendiente',
});
const pago = (medio: PagoPedido['medio'], monto: number): PagoPedido => ({
  medio,
  monto,
  estado: 'aprobado',
});

describe('debeContabilizarse', () => {
  it('solo pedidos pagados y no anulados', () => {
    expect(debeContabilizarse({ estado: 'en_preparacion', estadoPago: 'pagado' })).toBe(true);
    expect(debeContabilizarse({ estado: 'entregado', estadoPago: 'parcial' })).toBe(false);
    expect(debeContabilizarse({ estado: 'cancelado', estadoPago: 'pagado' })).toBe(false);
    expect(debeContabilizarse({ estado: 'rechazado', estadoPago: 'pagado' })).toBe(false);
  });
});

describe('aportePedido', () => {
  it('separa por medio, agrupa productos y no cuenta de más si cobraron de más', () => {
    const a = aportePedido({
      total: 10000,
      tipo: 'take_away',
      items: [item('papas', 2, 7000), item('coca', 1, 3000)],
      pagos: [pago('transferencia', 4000), pago('efectivo', 7000)],
    });
    expect(a.porMedio).toEqual({ efectivo: 6000, transferencia: 4000 });
    expect(a.productos.papas).toEqual({ nombre: 'papas', cantidad: 2, ventas: 7000 });
    expect(a.total).toBe(10000);
  });
});

describe('cierre de caja', () => {
  it('efectivo esperado = inicial + cobros en efectivo + ingresos − egresos', () => {
    const esperado = esperadoCaja(
      { montoInicial: 5000, totales: { efectivo: 30000, transferencia: 12000 } },
      [
        { tipo: 'egreso', monto: 8000 },
        { tipo: 'ingreso', monto: 1000 },
      ],
    );
    expect(esperado).toEqual({ efectivo: 28000, transferencia: 12000 });
    expect(diferenciaCaja(esperado, { efectivo: 27500, transferencia: 12000 })).toEqual({
      efectivo: -500,
      transferencia: 0,
    });
  });

  it('ticket promedio redondeado y sin dividir por cero', () => {
    expect(ticketPromedio(10000, 3)).toBe(3333);
    expect(ticketPromedio(0, 0)).toBe(0);
  });
});
