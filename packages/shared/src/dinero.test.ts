import { describe, expect, it } from 'vitest';
import { aplicarAjuste, esPesosEnteros, formatARS, redondear } from './dinero.js';

describe('formatARS', () => {
  it('formatea en pesos sin decimales', () => {
    // Intl usa espacio duro entre "$" y el número.
    expect(formatARS(11000).replace(/\s/g, ' ')).toBe('$ 11.000');
    expect(formatARS(0).replace(/\s/g, ' ')).toBe('$ 0');
  });
});

describe('redondear', () => {
  it('redondea al múltiplo', () => {
    expect(redondear(10080, 100)).toBe(10100);
    expect(redondear(10049, 100)).toBe(10000);
    expect(redondear(10001, 500, 'arriba')).toBe(10500);
    expect(redondear(10499, 500, 'abajo')).toBe(10000);
    expect(redondear(1234.6)).toBe(1235);
  });
});

describe('aplicarAjuste', () => {
  it('porcentaje con redondeo', () => {
    expect(aplicarAjuste(9000, { tipo: 'porcentaje', valor: 12 }, 100)).toBe(10100);
    expect(aplicarAjuste(9000, { tipo: 'porcentaje', valor: -10 }, 50)).toBe(8100);
  });
  it('monto fijo', () => {
    expect(aplicarAjuste(9000, { tipo: 'monto', valor: 750 }, 500)).toBe(10000);
  });
  it('nunca negativo', () => {
    expect(aplicarAjuste(500, { tipo: 'monto', valor: -1000 })).toBe(0);
  });
});

describe('esPesosEnteros', () => {
  it('acepta solo enteros no negativos', () => {
    expect(esPesosEnteros(100)).toBe(true);
    expect(esPesosEnteros(10.5)).toBe(false);
    expect(esPesosEnteros(-1)).toBe(false);
    expect(esPesosEnteros('100')).toBe(false);
  });
});
