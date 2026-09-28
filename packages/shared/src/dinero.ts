/** Dinero: siempre pesos enteros (number sin decimales). */

const formateadorARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** 11000 → "$ 11.000" */
export function formatARS(monto: number): string {
  return formateadorARS.format(monto);
}

export function esPesosEnteros(monto: unknown): monto is number {
  return typeof monto === 'number' && Number.isSafeInteger(monto) && monto >= 0;
}

export const MULTIPLOS_REDONDEO = [1, 10, 50, 100, 500] as const;
export type MultiploRedondeo = (typeof MULTIPLOS_REDONDEO)[number];
export type ModoRedondeo = 'cercano' | 'arriba' | 'abajo';

/** Redondea un monto al múltiplo indicado (por defecto, al más cercano). */
export function redondear(
  monto: number,
  multiplo: MultiploRedondeo = 1,
  modo: ModoRedondeo = 'cercano',
): number {
  const cociente = monto / multiplo;
  const entero =
    modo === 'arriba' ? Math.ceil(cociente) : modo === 'abajo' ? Math.floor(cociente) : Math.round(cociente);
  // "+ 0" evita devolver -0.
  return entero * multiplo + 0;
}

export type Ajuste = { tipo: 'porcentaje'; valor: number } | { tipo: 'monto'; valor: number };

/**
 * Aplica un ajuste de precio (actualización masiva). Nunca devuelve negativos.
 * Ej.: aplicarAjuste(9000, { tipo: 'porcentaje', valor: 12 }, 100) → 10100
 */
export function aplicarAjuste(
  precio: number,
  ajuste: Ajuste,
  multiplo: MultiploRedondeo = 1,
  modo: ModoRedondeo = 'cercano',
): number {
  const nuevo = ajuste.tipo === 'porcentaje' ? precio * (1 + ajuste.valor / 100) : precio + ajuste.valor;
  return Math.max(0, redondear(nuevo, multiplo, modo));
}
