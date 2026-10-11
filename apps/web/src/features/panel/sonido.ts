'use client';

/**
 * Aviso sonoro de pedido nuevo con Web Audio (sin archivos de audio).
 * Activado por defecto: se desbloquea automáticamente con el primer toque o click del usuario.
 */
const CLAVE = 'panel-sonido-v1';

let contexto: AudioContext | null = null;
let listenerRegistrado = false;

export function sonidoGuardado(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== '0';
  } catch {
    return true;
  }
}

export function guardarSonido(activo: boolean) {
  try {
    localStorage.setItem(CLAVE, activo ? '1' : '0');
  } catch {
    // sin almacenamiento: queda solo para esta pestaña
  }
}

/** Llamar desde un click: crea o reanuda el AudioContext. Devuelve si quedó habilitado. */
export async function habilitarSonido(): Promise<boolean> {
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') await contexto.resume();
    return contexto.state === 'running';
  } catch {
    return false;
  }
}

export function sonidoHabilitado(): boolean {
  return contexto?.state === 'running';
}

/**
 * Registra listeners globales al primer click o toque para desbloquear automáticamente el audio
 * respetando la política de autoplay del navegador sin forzar al usuario a buscar un botón.
 */
export function inicializarAudioAutomatico() {
  if (typeof window === 'undefined' || listenerRegistrado) return;
  listenerRegistrado = true;

  const desbloquear = () => {
    if (!sonidoGuardado()) return;
    try {
      contexto ??= new AudioContext();
      if (contexto.state === 'suspended') {
        void contexto.resume();
      }
    } catch {
      // Ignorar restricciones del navegador si aún no hubo gesto válido
    }
  };

  window.addEventListener('click', desbloquear, { passive: true });
  window.addEventListener('keydown', desbloquear, { passive: true });
  window.addEventListener('touchstart', desbloquear, { passive: true });
}

/** "Ding-dong" corto: dos tonos con caída suave. */
export function sonarPedidoNuevo() {
  if (!sonidoGuardado()) return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') {
      void contexto.resume();
    }
  } catch {
    // ignore
  }
  if (!contexto || contexto.state !== 'running') return;
  const ahora = contexto.currentTime;
  [
    { f: 880, t: 0 },
    { f: 660, t: 0.18 },
    { f: 880, t: 0.6 },
    { f: 660, t: 0.78 },
  ].forEach(({ f, t }) => {
    const osc = contexto!.createOscillator();
    const vol = contexto!.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    vol.gain.setValueAtTime(0.0001, ahora + t);
    vol.gain.exponentialRampToValueAtTime(0.35, ahora + t + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, ahora + t + 0.35);
    osc.connect(vol).connect(contexto!.destination);
    osc.start(ahora + t);
    osc.stop(ahora + t + 0.4);
  });
}

