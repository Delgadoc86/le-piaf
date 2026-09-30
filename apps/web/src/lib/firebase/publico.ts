/**
 * Firebase para la web pública: solo Functions (crearPedido) y Firestore (seguimiento), cargados
 * recién cuando hacen falta. Usa una app con nombre propio para no chocar con la del panel
 * (que trae Auth, Storage y cache persistente).
 */
import type { CrearPedidoInput, Seguimiento } from '@app/shared';
import { configFirebase, REGION_FUNCTIONS, usaEmuladores } from './config';

const NOMBRE_APP = 'publico';

async function app() {
  const { getApp, getApps, initializeApp } = await import('firebase/app');
  return getApps().some((a) => a.name === NOMBRE_APP)
    ? getApp(NOMBRE_APP)
    : initializeApp(configFirebase, NOMBRE_APP);
}

export interface PedidoCreado {
  id: string;
  numero: number;
  token: string;
  total: number;
  /** Cliente nuevo: tiene que confirmar por WhatsApp antes de este momento (ms) o se cancela. */
  porConfirmar: boolean;
  confirmarAntesDe: number | null;
}

let funcionesConectadas = false;

export async function crearPedido(input: CrearPedidoInput): Promise<PedidoCreado> {
  const [{ connectFunctionsEmulator, getFunctions, httpsCallable }, a] = await Promise.all([
    import('firebase/functions'),
    app(),
  ]);
  const functions = getFunctions(a, REGION_FUNCTIONS);
  if (usaEmuladores && !funcionesConectadas) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    funcionesConectadas = true;
  }
  const r = await httpsCallable<CrearPedidoInput, PedidoCreado>(functions, 'crearPedido')(input);
  return r.data;
}

/** El cliente cancela su pedido (solo mientras el local no lo aceptó). */
export async function cancelarPedidoCliente(token: string): Promise<void> {
  const [{ connectFunctionsEmulator, getFunctions, httpsCallable }, a] = await Promise.all([
    import('firebase/functions'),
    app(),
  ]);
  const functions = getFunctions(a, REGION_FUNCTIONS);
  if (usaEmuladores && !funcionesConectadas) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    funcionesConectadas = true;
  }
  await httpsCallable<{ token: string }, { ok: boolean }>(
    functions,
    'cancelarPedidoCliente',
  )({
    token,
  });
}

let firestoreConectado = false;

/** Escucha el espejo público del pedido. Devuelve la función para dejar de escuchar. */
export async function escucharSeguimiento(
  token: string,
  alCambiar: (s: Seguimiento | null) => void,
  alFallar: (e: Error) => void,
): Promise<() => void> {
  const [{ connectFirestoreEmulator, doc, getFirestore, onSnapshot }, a] = await Promise.all([
    import('firebase/firestore'),
    app(),
  ]);
  const db = getFirestore(a);
  if (usaEmuladores && !firestoreConectado) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    firestoreConectado = true;
  }
  return onSnapshot(
    doc(db, 'seguimiento', token),
    (snap) => alCambiar(snap.exists() ? (snap.data() as Seguimiento) : null),
    alFallar,
  );
}

/** Mensaje de un error de callable (HttpsError trae el texto en criollo desde la Function). */
export function mensajeErrorPedido(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo.includes('unavailable') || !navigator.onLine) {
    return 'Sin conexión. Revisá internet y probá de nuevo.';
  }
  if (codigo.includes('invalid-argument')) return 'Revisá los datos del pedido.';
  const mensaje = e instanceof Error ? e.message : '';
  return mensaje && !codigo.includes('internal')
    ? mensaje
    : 'No pudimos mandar el pedido. Probá de nuevo.';
}
