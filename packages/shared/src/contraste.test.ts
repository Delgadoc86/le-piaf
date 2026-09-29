import { describe, expect, it } from 'vitest';
import { contraste, nivelContraste } from './contraste.js';

describe('contraste', () => {
  it('blanco sobre negro es 21:1', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('la marca de Silverio pasa AA', () => {
    expect(nivelContraste(contraste('#CCCCCC', '#000000'))).toBe('AAA'); // texto secundario sobre fondo
    expect(nivelContraste(contraste('#000000', '#f59716'))).toBe('AAA'); // texto negro sobre botón naranja
  });

  it('gris claro sobre blanco no pasa', () => {
    expect(nivelContraste(contraste('#AAAAAA', '#FFFFFF'))).toBe('bajo');
  });
});
