'use client';

/**
 * Escrituras de la carta desde el panel. Los datos ya vienen validados con los esquemas de
 * @app/shared (los mismos campos que exigen las reglas en firestore.rules).
 */
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { AjustePreciosInput, CategoriaDatos, ProductoDatos, PromoDatos } from '@app/shared';
import { firebase } from '@/lib/firebase/client';

const db = () => firebase().db;

/** Id corto para variantes, grupos y opciones. */
export const nuevoId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);

/** Siguiente número de orden al final de la lista. */
export const siguienteOrden = (items: { orden: number }[]) =>
  items.reduce((m, i) => Math.max(m, i.orden), 0) + 1;

// ─── Productos ────────────────────────────────────────────────────────────────

export async function guardarProducto(id: string | null, datos: ProductoDatos): Promise<string> {
  const ref = id ? doc(db(), 'productos', id) : doc(collection(db(), 'productos'));
  await setDoc(ref, { ...datos, actualizadoEn: serverTimestamp() });
  return ref.id;
}

export function alternarDisponible(id: string, disponible: boolean) {
  return updateDoc(doc(db(), 'productos', id), { disponible, actualizadoEn: serverTimestamp() });
}

export function alternarVisibleProducto(id: string, visible: boolean) {
  return updateDoc(doc(db(), 'productos', id), { visible, actualizadoEn: serverTimestamp() });
}

export function eliminarProducto(id: string) {
  return deleteDoc(doc(db(), 'productos', id));
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function guardarCategoria(id: string | null, datos: CategoriaDatos): Promise<string> {
  const ref = id ? doc(db(), 'categorias', id) : doc(collection(db(), 'categorias'));
  await setDoc(ref, datos);
  return ref.id;
}

export function actualizarCategoria(id: string, cambios: Partial<CategoriaDatos>) {
  return updateDoc(doc(db(), 'categorias', id), cambios);
}

export function eliminarCategoria(id: string) {
  return deleteDoc(doc(db(), 'categorias', id));
}

// ─── Promos ───────────────────────────────────────────────────────────────────

export async function guardarPromo(id: string | null, datos: PromoDatos): Promise<string> {
  const ref = id ? doc(db(), 'promos', id) : doc(collection(db(), 'promos'));
  await setDoc(ref, datos);
  return ref.id;
}

export function alternarPromoActiva(id: string, activa: boolean) {
  return updateDoc(doc(db(), 'promos', id), { activa });
}

export function eliminarPromo(id: string) {
  return deleteDoc(doc(db(), 'promos', id));
}

// ─── Orden y precios ──────────────────────────────────────────────────────────

/** Guarda el nuevo orden (1, 2, 3…) de una lista en un solo batch. */
export async function reordenar(coleccion: 'categorias' | 'productos' | 'promos', ids: string[]) {
  const batch = writeBatch(db());
  ids.forEach((id, i) => batch.update(doc(db(), coleccion, id), { orden: i + 1 }));
  await batch.commit();
}

/** Actualización masiva: la aplica la Function (lotes de 500 + auditoría). */
export async function ajustarPrecios(input: AjustePreciosInput): Promise<number> {
  const fn = httpsCallable<AjustePreciosInput, { actualizados: number }>(
    firebase().functions,
    'ajustarPrecios',
  );
  return (await fn(input)).data.actualizados;
}
