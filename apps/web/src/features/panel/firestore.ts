'use client';

/** Lecturas en tiempo real para el panel (onSnapshot con la cache persistente de Firestore). */
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firebase } from '@/lib/firebase/client';

type Estado<T> = { datos: T; cargando: boolean; error: string | null };

export function useColeccion<T>(
  nombre: string,
  campoOrden = 'orden',
): Estado<(T & { id: string })[]> {
  const [estado, setEstado] = useState<Estado<(T & { id: string })[]>>({
    datos: [],
    cargando: true,
    error: null,
  });
  useEffect(() => {
    const q = query(collection(firebase().db, nombre), orderBy(campoOrden));
    return onSnapshot(
      q,
      (snap) =>
        setEstado({
          datos: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
          cargando: false,
          error: null,
        }),
      (e) => setEstado((s) => ({ ...s, cargando: false, error: e.message })),
    );
  }, [nombre, campoOrden]);
  return estado;
}

export function useDocumento<T>(ruta: string): Estado<T | null> {
  const [estado, setEstado] = useState<Estado<T | null>>({
    datos: null,
    cargando: true,
    error: null,
  });
  useEffect(() => {
    return onSnapshot(
      doc(firebase().db, ruta),
      (snap) =>
        setEstado({
          datos: snap.exists() ? (snap.data() as T) : null,
          cargando: false,
          error: null,
        }),
      (e) => setEstado((s) => ({ ...s, cargando: false, error: e.message })),
    );
  }, [ruta]);
  return estado;
}

/** Mensaje de error de Firebase en criollo. */
export function mensajeError(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo.includes('permission-denied')) return 'No tenés permiso para hacer esto.';
  if (codigo.includes('unavailable'))
    return 'Sin conexión. Se va a guardar cuando vuelva internet.';
  return e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.';
}
