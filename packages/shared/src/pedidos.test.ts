import { describe, expect, it } from 'vitest';
import {
  claveJornada,
  estadoPagoDe,
  inicioJornada,
  totalConEnvio,
  puedePasar,
  resumenCaja,
  siguienteEstado,
  vuelto,
} from './pedidos.js';
import type { PagoPedido } from './tipos.js';

const ZONA = 'America/Argentina/Mendoza'; // UTC-3, sin horario de verano

describe('máquina de estados', () => {
  it('take away: pendiente → preparación → listo → entregado', () => {
    expect(siguienteEstado('pendiente', 'take_away')).toBe('en_preparacion');
    expect(siguienteEstado('en_preparacion', 'take_away')).toBe('listo');
    expect(siguienteEstado('listo', 'take_away')).toBe('entregado');
    expect(siguienteEstado('entregado', 'take_away')).toBeNull();
  });

  it('delivery pasa por "en camino"', () => {
    expect(siguienteEstado('listo', 'delivery')).toBe('en_camino');
    expect(siguienteEstado('en_camino', 'delivery')).toBe('entregado');
    expect(puedePasar('listo', 'en_camino', 'take_away')).toBe(false);
  });

  it('solo se rechaza un pedido nuevo; cancelar se puede hasta antes de entregar', () => {
    expect(puedePasar('pendiente', 'rechazado', 'take_away')).toBe(true);
    expect(puedePasar('en_preparacion', 'rechazado', 'take_away')).toBe(false);
    expect(puedePasar('listo', 'cancelado', 'take_away')).toBe(true);
    expect(puedePasar('entregado', 'cancelado', 'take_away')).toBe(false);
    expect(puedePasar('cancelado', 'pendiente', 'take_away')).toBe(false);
  });
});

describe('pagos', () => {
  const pago = (
    medio: PagoPedido['medio'],
    monto: number,
    estado: PagoPedido['estado'] = 'aprobado',
  ): PagoPedido => ({ medio, monto, estado });

  it('estado del pago según lo cobrado', () => {
    expect(estadoPagoDe([], 1000)).toBe('pendiente');
    expect(estadoPagoDe([pago('efectivo', 400)], 1000)).toBe('parcial');
    expect(estadoPagoDe([pago('efectivo', 400), pago('transferencia', 600)], 1000)).toBe('pagado');
    expect(estadoPagoDe([pago('efectivo', 1000, 'rechazado')], 1000)).toBe('pendiente');
  });

  it('vuelto', () => {
    expect(vuelto(8500, 10000)).toBe(1500);
    expect(vuelto(8500, 5000)).toBe(0);
    expect(vuelto(8500, undefined)).toBe(0);
  });

  it('resumen de caja: separa medios, ignora anulados y calcula lo que falta cobrar', () => {
    const r = resumenCaja([
      { estado: 'entregado', total: 1000, pagos: [pago('efectivo', 1000)] },
      { estado: 'listo', total: 2000, pagos: [pago('transferencia', 500)] },
      { estado: 'pendiente', total: 3000, pagos: [] },
      { estado: 'cancelado', total: 9999, pagos: [pago('efectivo', 9999)] },
    ]);
    expect(r.porMedio).toEqual({ efectivo: 1000, transferencia: 500 });
    expect(r.cobrado).toBe(1500);
    expect(r.porCobrar).toBe(4500);
    expect(r.vendido).toBe(6000);
    expect(r.pedidos).toBe(3);
    expect(r.anulados).toBe(1);
  });
});

describe('jornada (corte a las 06:00 hora local)', () => {
  it('la madrugada pertenece a la jornada anterior', () => {
    // Sábado 03-10 01:30 en Mendoza = 04:30 UTC.
    const madrugada = new Date('2026-10-03T04:30:00Z');
    expect(claveJornada(madrugada, ZONA)).toBe('2026-10-02');
    expect(inicioJornada(madrugada, ZONA).toISOString()).toBe('2026-10-02T09:00:00.000Z');
  });

  it('después del corte empieza la jornada nueva', () => {
    const mediodia = new Date('2026-10-03T15:12:34.567Z'); // 12:12 en Mendoza
    expect(claveJornada(mediodia, ZONA)).toBe('2026-10-03');
    expect(inicioJornada(mediodia, ZONA).toISOString()).toBe('2026-10-03T09:00:00.000Z');
  });

  it('justo a las 06:00 ya es la jornada nueva', () => {
    const corte = new Date('2026-10-03T09:00:00Z');
    expect(claveJornada(corte, ZONA)).toBe('2026-10-03');
  });
});

describe('envío', () => {
  it('el total suma el envío que confirma el local', () => {
    expect(totalConEnvio({ subtotal: 9000, descuento: 0 }, 1500)).toBe(10500);
    expect(totalConEnvio({ subtotal: 9000, descuento: 1000 }, 0)).toBe(8000);
  });
});
