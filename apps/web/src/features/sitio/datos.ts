/**
 * Datos de la web pública. Se leen con el Admin SDK UNA vez y quedan en cache hasta que
 * revalidarWeb invalida la etiqueta 'carta' (ROADMAP §10): las visitas no generan lecturas.
 */
import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import {
  DOC_LOCAL,
  type CategoriaDatos,
  type LocalEditable,
  type ProductoDatos,
  type PromoDatos,
} from '@app/shared';
import { adminDb } from '@/lib/firebase/admin';

export const TAG_CARTA = 'carta';

export type LocalPublico = LocalEditable;
export type CategoriaPublica = CategoriaDatos & { id: string };
export type ProductoPublico = ProductoDatos & { id: string };
export type PromoPublica = PromoDatos & { id: string };

export interface DatosSitio {
  local: LocalPublico;
  categorias: CategoriaPublica[];
  productos: ProductoPublico[];
  promos: PromoPublica[];
}

/** Firestore devuelve Timestamps (clases): se descartan porque la web no los usa y no son serializables. */
function limpiar<T>(datos: FirebaseFirestore.DocumentData): T {
  const copia: Record<string, unknown> = { ...datos };
  delete copia.actualizadoEn;
  delete copia.creadoEn;
  if (copia.pedidos && typeof copia.pedidos === 'object') {
    const pedidos = { ...(copia.pedidos as Record<string, unknown>) };
    delete pedidos.pausadoHasta;
    copia.pedidos = pedidos;
  }
  return copia as T;
}

export async function obtenerSitio(): Promise<DatosSitio | null> {
  'use cache';
  cacheLife('max');
  cacheTag(TAG_CARTA);

  const [local, categorias, productos, promos] = await Promise.all([
    adminDb.doc(DOC_LOCAL).get(),
    adminDb.collection('categorias').orderBy('orden').get(),
    adminDb.collection('productos').orderBy('orden').get(),
    adminDb.collection('promos').orderBy('orden').get(),
  ]);
  if (!local.exists) return null;

  return {
    local: limpiar<LocalPublico>(local.data()!),
    categorias: categorias.docs
      .map((d) => ({ ...limpiar<CategoriaDatos>(d.data()), id: d.id }))
      .filter((c) => c.visible),
    productos: productos.docs
      .map((d) => ({ ...limpiar<ProductoDatos>(d.data()), id: d.id }))
      .filter((p) => p.visible),
    promos: promos.docs.map((d) => ({ ...limpiar<PromoDatos>(d.data()), id: d.id })).filter((p) => p.activa),
  };
}
