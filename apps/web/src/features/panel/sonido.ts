'use client';

/**
 * Aviso sonoro de pedido nuevo con Web Audio (sin archivos externos) y Screen Wake Lock API (MDN).
 * - Timbre activado por defecto: se desbloquea con el primer toque o desde el botón explícito.
 * - Wake Lock: mantiene la pantalla encendida durante el turno y se readquiere automáticamente
 *   en `visibilitychange` cuando la pestaña vuelve a primer plano (especificación oficial W3C/MDN).
 */
import { useEffect, useState } from 'react';

const CLAVE = 'panel-sonido-v1';

/** Intervalo de repetición del timbre mientras existan pedidos web pendientes sin aceptar. */
export const INTERVALO_TIMBRE_PENDIENTES_MS = 25_000;

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
 * respetando la política de autoplay del navegador.
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

/** "Ding-dong" doble de alta presencia para ambientes con ruido de cocina. */
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
    osc.type = 'triangle';
    osc.frequency.value = f;
    vol.gain.setValueAtTime(0.0001, ahora + t);
    vol.gain.exponentialRampToValueAtTime(0.4, ahora + t + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.0001, ahora + t + 0.38);
    osc.connect(vol).connect(contexto!.destination);
    osc.start(ahora + t);
    osc.stop(ahora + t + 0.42);
  });
}

/**
 * Hook que mantiene encendida la pantalla del dispositivo (tablet/mostrador) usando
 * `navigator.wakeLock.request('screen')` y readquiere el candado al volver a la pestaña.
 */
export function useWakeLock(): boolean {
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let wakeLock: WakeLockSentinel | null = null;
    let cancelado = false;

    const solicitar = async () => {
      if (cancelado || document.visibilityState !== 'visible' || wakeLock !== null) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        if (cancelado) {
          void wakeLock.release();
          wakeLock = null;
          return;
        }
        setActivo(true);
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
          if (!cancelado) setActivo(false);
        });
      } catch {
        setActivo(false);
      }
    };

    void solicitar();

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible' && wakeLock === null) {
        void solicitar();
      }
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      if (wakeLock !== null) {
        void wakeLock.release();
        wakeLock = null;
      }
    };
  }, []);

  return activo;
}
