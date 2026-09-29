/** Vigencia de promos y resumen de horarios para mostrar en la web. */
import type { Horario, PromoDatos } from './esquemas.js';
import { horaAMinutos, NOMBRES_DIAS, partesEnZona } from './horarios.js';

/**
 * ¿La promo se puede ofrecer en este instante? Tiene que estar activa y, si tiene vigencia,
 * cumplir días, franja horaria (puede cruzar la medianoche) y fecha de fin (inclusive).
 */
export function promoVigente(
  promo: Pick<PromoDatos, 'activa' | 'vigencia'>,
  instante: Date,
  zonaHoraria: string,
): boolean {
  if (!promo.activa) return false;
  const v = promo.vigencia;
  if (!v) return true;

  const ahora = partesEnZona(instante, zonaHoraria);
  if (v.fechaFin && ahora.fecha > v.fechaFin) return false;
  if (v.dias.length > 0 && !v.dias.includes(ahora.dia)) return false;

  if (v.desde && v.hasta) {
    const desde = horaAMinutos(v.desde);
    const hasta = horaAMinutos(v.hasta);
    return desde < hasta
      ? ahora.minutos >= desde && ahora.minutos < hasta
      : ahora.minutos >= desde || ahora.minutos < hasta;
  }
  if (v.desde) return ahora.minutos >= horaAMinutos(v.desde);
  if (v.hasta) return ahora.minutos < horaAMinutos(v.hasta);
  return true;
}

const ABREVIATURAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
/** Orden de lectura en Argentina: la semana empieza el lunes. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;

/** [1,2,3,4,5] → "Lun a Vie"; [6,0] → "Sáb y Dom"; [1,3,5] → "Lun, Mié y Vie". */
export function resumirDias(dias: readonly number[]): string {
  const ordenados = ORDEN_SEMANA.filter((d) => dias.includes(d));
  if (ordenados.length === 7) return 'Todos los días';
  if (ordenados.length === 0) return '';

  // Agrupar en tramos consecutivos según el orden de la semana (lunes primero).
  const tramos: number[][] = [];
  for (const d of ordenados) {
    const ultimo = tramos.at(-1);
    const indice = ORDEN_SEMANA.indexOf(d as (typeof ORDEN_SEMANA)[number]);
    const previo = ultimo?.at(-1);
    if (
      ultimo &&
      previo !== undefined &&
      ORDEN_SEMANA.indexOf(previo as (typeof ORDEN_SEMANA)[number]) === indice - 1
    ) {
      ultimo.push(d);
    } else {
      tramos.push([d]);
    }
  }

  const textos = tramos.flatMap((t) => {
    const a = ABREVIATURAS[t[0]!];
    const b = ABREVIATURAS[t.at(-1)!];
    if (t.length >= 3) return [`${a} a ${b}`];
    return t.map((d) => ABREVIATURAS[d]);
  });
  return textos.length === 1 ? textos[0]! : `${textos.slice(0, -1).join(', ')} y ${textos.at(-1)}`;
}

/** Horarios en líneas legibles: [{ dias: "Lun a Vie", horas: "11:00 – 02:00" }]. */
export function resumirHorarios(horarios: readonly Horario[]): { dias: string; horas: string }[] {
  return horarios.map((h) => ({ dias: resumirDias(h.dias), horas: `${h.desde} – ${h.hasta}` }));
}

export function nombreDia(dia: number): string {
  return NOMBRES_DIAS[dia] ?? '';
}
