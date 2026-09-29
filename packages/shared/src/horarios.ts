/**
 * Horarios y fechas en la zona horaria del local. Usa solo Intl (sin dependencias),
 * así funciona igual en el navegador, en Next.js y en las Functions.
 *
 * Regla: un turno que cruza la medianoche pertenece al día en que abrió.
 * Por eso un cierre especial del sábado cierra el turno que abre el sábado
 * (incluida su madrugada del domingo), pero no la madrugada del viernes al sábado.
 */
import type { CierreEspecial, Horario } from './esquemas.js';

const MINUTOS_DIA = 24 * 60;

export interface PartesFecha {
  /** YYYY-MM-DD en la zona del local. */
  fecha: string;
  /** 0 = domingo … 6 = sábado. */
  dia: number;
  /** Minutos desde las 00:00 en la zona del local. */
  minutos: number;
}

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zonaHoraria: string): Intl.DateTimeFormat {
  let f = formateadores.get(zonaHoraria);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formateadores.set(zonaHoraria, f);
  }
  return f;
}

/** Fecha, día de la semana y minutos del día de un instante, vistos en la zona del local. */
export function partesEnZona(instante: Date, zonaHoraria: string): PartesFecha {
  const partes: Record<string, string> = {};
  for (const p of formateador(zonaHoraria).formatToParts(instante)) partes[p.type] = p.value;
  const anio = Number(partes.year);
  const mes = Number(partes.month);
  const dia = Number(partes.day);
  const fecha = `${partes.year}-${partes.month}-${partes.day}`;
  return {
    fecha,
    dia: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(),
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

/** Clave de día YYYY-MM-DD en la zona del local (para contadores y statsDiarias). */
export function claveDia(instante: Date, zonaHoraria: string): string {
  return partesEnZona(instante, zonaHoraria).fecha;
}

/** Suma días a una fecha de calendario YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): { fecha: string; dia: number } {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const utc = new Date(Date.UTC(a, m - 1, d + dias));
  return { fecha: utc.toISOString().slice(0, 10), dia: utc.getUTCDay() };
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/** Duración del turno en minutos. "hasta" <= "desde" cruza la medianoche; iguales = 24 h. */
function duracionTurno(h: Horario): number {
  const desde = horaAMinutos(h.desde);
  const hasta = horaAMinutos(h.hasta);
  return hasta > desde ? hasta - desde : hasta + MINUTOS_DIA - desde;
}

export interface DatosHorario {
  zonaHoraria: string;
  horarios: Horario[];
  cierresEspeciales?: CierreEspecial[] | undefined;
}

function estaCerradoEspecial(local: DatosHorario, fecha: string): boolean {
  return local.cierresEspeciales?.some((c) => c.fecha === fecha) ?? false;
}

/** ¿El local está abierto en ese instante según sus horarios y cierres especiales? */
export function estaAbierto(local: DatosHorario, instante: Date = new Date()): boolean {
  const ahora = partesEnZona(instante, local.zonaHoraria);
  const ayer = sumarDias(ahora.fecha, -1);

  for (const h of local.horarios) {
    const desde = horaAMinutos(h.desde);
    const fin = desde + duracionTurno(h);

    // Turno que abrió hoy.
    if (h.dias.includes(ahora.dia) && ahora.minutos >= desde && ahora.minutos < fin) {
      if (!estaCerradoEspecial(local, ahora.fecha)) return true;
    }
    // Turno que abrió ayer y sigue después de la medianoche.
    if (fin > MINUTOS_DIA && h.dias.includes(ayer.dia) && ahora.minutos + MINUTOS_DIA < fin) {
      if (!estaCerradoEspecial(local, ayer.fecha)) return true;
    }
  }
  return false;
}

export interface ProximaApertura {
  /** YYYY-MM-DD en la zona del local. */
  fecha: string;
  dia: number;
  /** "HH:mm" */
  hora: string;
  /** 0 = hoy, 1 = mañana… */
  enDias: number;
}

/**
 * Próxima apertura a partir del instante dado (busca hasta 14 días).
 * Sirve para "Cerrado · abre a las 20:00". Devuelve null si no hay horarios.
 */
export function proximaApertura(
  local: DatosHorario,
  instante: Date = new Date(),
): ProximaApertura | null {
  const ahora = partesEnZona(instante, local.zonaHoraria);
  for (let enDias = 0; enDias <= 14; enDias++) {
    const { fecha, dia } = sumarDias(ahora.fecha, enDias);
    if (estaCerradoEspecial(local, fecha)) continue;
    const candidatas = local.horarios
      .filter((h) => h.dias.includes(dia))
      .map((h) => h.desde)
      .filter((desde) => enDias > 0 || horaAMinutos(desde) > ahora.minutos)
      .sort();
    const hora = candidatas[0];
    if (hora) return { fecha, dia, hora, enDias };
  }
  return null;
}

export const NOMBRES_DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;
