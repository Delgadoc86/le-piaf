'use client';

/**
 * Aviso sonoro de pedido nuevo con Web Audio (sin archivos de audio). El navegador exige un toque
 * del usuario para habilitar el sonido: por eso el panel muestra "Activar sonido".
 */
const CLAVE = 'panel-sonido-v1';

let contexto: AudioContext | null = null;

export function sonidoGuardado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
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

/** "Ding-dong" corto: dos tonos con caída suave. */
export function sonarPedidoNuevo() {
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
