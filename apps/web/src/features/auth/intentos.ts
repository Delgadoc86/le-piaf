/**
 * Límite de intentos de login en este navegador: 5 fallos seguidos → 10 minutos de espera (o
 * recuperar la contraseña). Es una ayuda de UX: la protección real la hace Firebase Auth en el
 * servidor (auth/too-many-requests), que también se trata como bloqueo.
 */
const CLAVE = 'login-intentos-v1';
export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 10 * 60_000;

type Registro = Record<string, { fallos: number; hasta?: number }>;

function leer(): Registro {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Registro;
  } catch {
    return {};
  }
}

function escribir(r: Registro) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    // sin almacenamiento: el límite queda solo en Firebase
  }
}

const normal = (email: string) => email.trim().toLowerCase();

/** Hasta cuándo está bloqueado ese email en este navegador (null si no lo está). */
export function bloqueadoHasta(email: string, ahora = Date.now()): number | null {
  const hasta = leer()[normal(email)]?.hasta;
  return hasta && hasta > ahora ? hasta : null;
}

export function intentosRestantes(email: string): number {
  const r = leer()[normal(email)];
  if (!r || (r.hasta && r.hasta <= Date.now())) return MAX_INTENTOS;
  return Math.max(0, MAX_INTENTOS - r.fallos);
}

/** Suma un fallo; al llegar al máximo (o si Firebase ya bloqueó) arranca la espera. */
export function registrarFallo(email: string, forzarBloqueo = false): number | null {
  const r = leer();
  const clave = normal(email);
  const actual = r[clave];
  const vencido = actual?.hasta !== undefined && actual.hasta <= Date.now();
  const fallos = (vencido || !actual ? 0 : actual.fallos) + 1;
  const hasta = forzarBloqueo || fallos >= MAX_INTENTOS ? Date.now() + BLOQUEO_MS : undefined;
  r[clave] = hasta ? { fallos, hasta } : { fallos };
  escribir(r);
  return hasta ?? null;
}

/** Entró bien o pidió recuperar la contraseña: se limpia el contador. */
export function limpiarIntentos(email: string) {
  const r = leer();
  delete r[normal(email)];
  escribir(r);
}
