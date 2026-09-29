'use client';

/**
 * Caja y ventas en el panel. Abrir y cerrar la caja pasa por Functions (abrirCaja, cerrarCaja);
 * los movimientos los escribe el panel (firestore.rules); los totales los suma contabilizarPedido.
 */
import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type {
  AbrirCajaInput,
  CerrarCajaInput,
  MovimientoCaja,
  MovimientoCajaDatos,
  PorMedio,
  StatsDiarias,
  TurnoCaja,
} from '@app/shared';
import { firebase } from '@/lib/firebase/client';

export type TurnoConId = TurnoCaja & { id: string };
export type MovimientoConId = MovimientoCaja & { id: string };

type Lista<T> = { datos: T[]; cargando: boolean; error: string | null };

function useConsulta<T>(armar: (() => ReturnType<typeof query>) | null, deps: unknown[]): Lista<T> {
  const [estado, setEstado] = useState<Lista<T>>({ datos: [], cargando: true, error: null });
  useEffect(() => {
    if (!armar) return;
    return onSnapshot(
      armar(),
      (snap) =>
        setEstado({
          datos: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
          cargando: false,
          error: null,
        }),
      (e) => setEstado((s) => ({ ...s, cargando: false, error: e.message })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return estado;
}

const db = () => firebase().db;

/** La caja abierta (o null). */
export function useCajaAbierta(): { turno: TurnoConId | null; cargando: boolean } {
  const r = useConsulta<TurnoConId>(
    () =>
      query(
        collection(db(), 'turnosCaja'),
        where('estado', '==', 'abierto'),
        orderBy('abiertoEn', 'desc'),
        limit(1),
      ),
    [],
  );
  return { turno: r.datos[0] ?? null, cargando: r.cargando };
}

export function useMovimientos(turnoId: string | null) {
  return useConsulta<MovimientoConId>(
    turnoId
      ? () => query(collection(db(), 'turnosCaja', turnoId, 'movimientos'), orderBy('en', 'desc'))
      : null,
    [turnoId],
  );
}

/** Últimos cierres, el más reciente primero. */
export function useCierres(cantidad = 30) {
  return useConsulta<TurnoConId>(
    () =>
      query(
        collection(db(), 'turnosCaja'),
        where('estado', '==', 'cerrado'),
        orderBy('abiertoEn', 'desc'),
        limit(cantidad),
      ),
    [cantidad],
  );
}

/** statsDiarias desde una jornada (YYYY-MM-DD) en adelante (el id del documento también es la jornada). */
export function useStatsDesde(desde: string) {
  return useConsulta<StatsDiarias & { id: string }>(
    () =>
      query(
        collection(db(), 'statsDiarias'),
        where('jornada', '>=', desde),
        orderBy('jornada', 'desc'),
      ),
    [desde],
  );
}

export async function abrirCaja(input: AbrirCajaInput) {
  await httpsCallable<AbrirCajaInput, { id: string }>(firebase().functions, 'abrirCaja')(input);
}

export async function cerrarCaja(input: CerrarCajaInput) {
  const r = await httpsCallable<
    CerrarCajaInput,
    { esperado: PorMedio; contado: PorMedio; diferencia: PorMedio }
  >(
    firebase().functions,
    'cerrarCaja',
  )(input);
  return r.data;
}

export function anotarMovimiento(turnoId: string, datos: MovimientoCajaDatos, uid: string) {
  return addDoc(collection(db(), 'turnosCaja', turnoId, 'movimientos'), {
    ...datos,
    porUid: uid,
    en: serverTimestamp(),
  });
}

export const ETIQUETA_CATEGORIA: Record<MovimientoCaja['categoria'], string> = {
  proveedor: 'Proveedor',
  cambio: 'Cambio',
  retiro: 'Retiro',
  otro: 'Otro',
};

/** "2026-10-03" → "sáb 3/10". */
export function fechaCorta(jornada: string): string {
  const [a, m, d] = jornada.split('-').map(Number);
  const fecha = new Date(Date.UTC(a!, m! - 1, d!));
  const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' }).format(fecha);
  return `${dia.replace('.', '')} ${d}/${m}`;
}
