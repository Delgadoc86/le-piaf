import { describe, expect, it } from 'vitest';
import { claveDia, estaAbierto, partesEnZona, proximaApertura, type DatosHorario } from './horarios.js';

/** Instante a partir de una hora local de Mendoza (UTC-3, sin horario de verano). */
const mza = (fechaHora: string) => new Date(`${fechaHora}:00-03:00`);

// Horarios de Silverio: L-V 11:00–02:00, S-D 11:00–03:00 (ambos cruzan la medianoche).
// Fechas de referencia: vie 2026-10-02, sáb 03, dom 04, lun 05.
const silverio: DatosHorario = {
  zonaHoraria: 'America/Argentina/Mendoza',
  horarios: [
    { dias: [1, 2, 3, 4, 5], desde: '11:00', hasta: '02:00' },
    { dias: [6, 0], desde: '11:00', hasta: '03:00' },
  ],
};

describe('partesEnZona / claveDia', () => {
  it('calcula día y fecha en la zona del local, no en UTC', () => {
    const instante = new Date('2026-10-03T02:30:00Z'); // vie 23:30 en Mendoza
    expect(partesEnZona(instante, 'America/Argentina/Mendoza')).toEqual({
      fecha: '2026-10-02',
      dia: 5,
      minutos: 23 * 60 + 30,
    });
    expect(partesEnZona(instante, 'UTC').dia).toBe(6);
    expect(claveDia(instante, 'America/Argentina/Mendoza')).toBe('2026-10-02');
  });
});

describe('estaAbierto', () => {
  it('abre y cierra en los bordes del turno', () => {
    expect(estaAbierto(silverio, mza('2026-10-05T10:59'))).toBe(false); // lun (pero la madrugada del dom ya cerró)
    expect(estaAbierto(silverio, mza('2026-10-05T11:00'))).toBe(true);
    expect(estaAbierto(silverio, mza('2026-10-02T23:30'))).toBe(true);
  });

  it('turnos que cruzan la medianoche', () => {
    expect(estaAbierto(silverio, mza('2026-10-03T01:30'))).toBe(true); // madrugada del vie→sáb
    expect(estaAbierto(silverio, mza('2026-10-03T02:00'))).toBe(false); // "hasta" es exclusivo
    expect(estaAbierto(silverio, mza('2026-10-03T02:30'))).toBe(false);
    expect(estaAbierto(silverio, mza('2026-10-04T02:30'))).toBe(true); // sáb→dom hasta las 03
    expect(estaAbierto(silverio, mza('2026-10-05T02:30'))).toBe(true); // dom→lun hasta las 03
    expect(estaAbierto(silverio, mza('2026-10-05T03:00'))).toBe(false);
  });

  it('un cierre especial cierra el turno que abre ese día, incluida su madrugada', () => {
    const conCierre = { ...silverio, cierresEspeciales: [{ fecha: '2026-10-03', motivo: 'Evento privado' }] };
    expect(estaAbierto(conCierre, mza('2026-10-03T01:30'))).toBe(true); // turno del viernes
    expect(estaAbierto(conCierre, mza('2026-10-03T12:00'))).toBe(false);
    expect(estaAbierto(conCierre, mza('2026-10-04T02:00'))).toBe(false); // madrugada del turno del sábado
    expect(estaAbierto(conCierre, mza('2026-10-04T12:00'))).toBe(true);
  });

  it('desde == hasta es un turno de 24 h', () => {
    const siempre = { ...silverio, horarios: [{ dias: [0, 1, 2, 3, 4, 5, 6], desde: '00:00', hasta: '00:00' }] };
    expect(estaAbierto(siempre, mza('2026-10-05T04:00'))).toBe(true);
  });

  it('sin horarios, cerrado', () => {
    expect(estaAbierto({ ...silverio, horarios: [] }, mza('2026-10-05T12:00'))).toBe(false);
  });
});

describe('proximaApertura', () => {
  it('devuelve la apertura de hoy si todavía no abrió', () => {
    expect(proximaApertura(silverio, mza('2026-10-03T02:30'))).toEqual({
      fecha: '2026-10-03',
      dia: 6,
      hora: '11:00',
      enDias: 0,
    });
  });

  it('saltea los cierres especiales', () => {
    const conCierre = { ...silverio, cierresEspeciales: [{ fecha: '2026-10-03', motivo: '' }] };
    expect(proximaApertura(conCierre, mza('2026-10-03T02:30'))).toMatchObject({ fecha: '2026-10-04', enDias: 1 });
  });

  it('null si no hay horarios', () => {
    expect(proximaApertura({ ...silverio, horarios: [] })).toBeNull();
  });
});
