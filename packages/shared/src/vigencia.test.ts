import { describe, expect, it } from 'vitest';
import { bannerVigente, promoVigente, resumirDias, resumirHorarios } from './vigencia.js';

const ZONA = 'America/Argentina/Mendoza';
const mza = (fechaHora: string) => new Date(`${fechaHora}:00-03:00`);
// Referencias: lun 2026-10-05, vie 2026-10-02, sáb 2026-10-03.

describe('promoVigente', () => {
  it('inactiva nunca; activa sin vigencia siempre', () => {
    expect(promoVigente({ activa: false }, mza('2026-10-05T12:00'), ZONA)).toBe(false);
    expect(promoVigente({ activa: true }, mza('2026-10-05T12:00'), ZONA)).toBe(true);
  });

  it('respeta días y franja horaria', () => {
    const p = { activa: true, vigencia: { dias: [1, 2, 3, 4], desde: '19:00', hasta: '21:00' } };
    expect(promoVigente(p, mza('2026-10-05T19:30'), ZONA)).toBe(true);
    expect(promoVigente(p, mza('2026-10-05T21:00'), ZONA)).toBe(false);
    expect(promoVigente(p, mza('2026-10-05T18:59'), ZONA)).toBe(false);
    expect(promoVigente(p, mza('2026-10-02T19:30'), ZONA)).toBe(false); // viernes
  });

  it('franja que cruza la medianoche', () => {
    const p = { activa: true, vigencia: { dias: [], desde: '23:00', hasta: '02:00' } };
    expect(promoVigente(p, mza('2026-10-05T23:30'), ZONA)).toBe(true);
    expect(promoVigente(p, mza('2026-10-05T01:00'), ZONA)).toBe(true);
    expect(promoVigente(p, mza('2026-10-05T03:00'), ZONA)).toBe(false);
  });

  it('fecha de fin inclusive', () => {
    const p = { activa: true, vigencia: { dias: [], fechaFin: '2026-10-03' } };
    expect(promoVigente(p, mza('2026-10-03T23:59'), ZONA)).toBe(true);
    expect(promoVigente(p, mza('2026-10-04T00:01'), ZONA)).toBe(false);
  });
});

describe('resumirDias', () => {
  it('agrupa tramos consecutivos empezando el lunes', () => {
    expect(resumirDias([1, 2, 3, 4, 5])).toBe('Lun a Vie');
    expect(resumirDias([6, 0])).toBe('Sáb y Dom');
    expect(resumirDias([0, 1, 2, 3, 4, 5, 6])).toBe('Todos los días');
    expect(resumirDias([1, 3, 5])).toBe('Lun, Mié y Vie');
    expect(resumirDias([2, 3, 4, 5, 6, 0])).toBe('Mar a Dom');
    expect(resumirDias([4])).toBe('Jue');
    expect(resumirDias([])).toBe('');
  });
});

describe('resumirHorarios', () => {
  it('arma líneas legibles', () => {
    expect(
      resumirHorarios([
        { dias: [1, 2, 3, 4, 5], desde: '11:00', hasta: '02:00' },
        { dias: [6, 0], desde: '11:00', hasta: '03:00' },
      ]),
    ).toEqual([
      { dias: 'Lun a Vie', horas: '11:00 – 02:00' },
      { dias: 'Sáb y Dom', horas: '11:00 – 03:00' },
    ]);
  });
});

describe('bannerVigente', () => {
  const banner = {
    activo: true,
    imagenPcUrl: 'pc.webp',
    imagenMovilUrl: 'movil.webp',
    alt: 'Día del Padre',
  };

  it('activo y sin fechas: siempre', () => {
    expect(bannerVigente(banner, mza('2026-10-05T12:00'), ZONA)).toBe(true);
  });

  it('respeta el rango de fechas (inclusive) en la zona del local', () => {
    const b = { ...banner, desde: '2026-10-03', hasta: '2026-10-05' };
    expect(bannerVigente(b, mza('2026-10-02T23:59'), ZONA)).toBe(false);
    expect(bannerVigente(b, mza('2026-10-03T00:00'), ZONA)).toBe(true);
    expect(bannerVigente(b, mza('2026-10-05T23:59'), ZONA)).toBe(true);
    expect(bannerVigente(b, mza('2026-10-06T00:00'), ZONA)).toBe(false);
  });

  it('inactivo, sin imágenes o sin banner: no se muestra', () => {
    expect(bannerVigente({ ...banner, activo: false }, mza('2026-10-05T12:00'), ZONA)).toBe(false);
    expect(bannerVigente({ ...banner, imagenMovilUrl: '' }, mza('2026-10-05T12:00'), ZONA)).toBe(
      false,
    );
    expect(bannerVigente(undefined, mza('2026-10-05T12:00'), ZONA)).toBe(false);
  });
});
