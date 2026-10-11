/**
 * Script puntual para actualizar únicamente la carta (categorías, productos y promos)
 * en el proyecto de producción (silverio-club) usando service-account.json.
 *
 * No toca usuarios, miembros, cajas, pedidos ni la configuración del local.
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { categoriaSchema, productoSchema, promoSchema } from '@app/shared';

const sa = JSON.parse(readFileSync('service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const ahora = FieldValue.serverTimestamp();

// Mapeo de fotos existentes en Firebase Storage para no perderlas
const FOTOS_STORAGE: Record<string, string> = {
  'chori': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun3kp7e-p9azwi.webp?alt=media',
  'hamburguesa-grande-de-carne': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun3j0a4-06smvh.webp?alt=media',
  'sandwich-de-milanesa-de-carne': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmunay61r-mu17h8.webp?alt=media',
  'sandwich-de-milanesa-de-pollo': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmunb05gq-ew9d3z.webp?alt=media',
  'lomo': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmunaqhtb-tutv1u.webp?alt=media',
  'pizzas-redondas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun4vwon-x7h1eo.webp?alt=media',
  'pancho-comun': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun4ti1s-lddkso.webp?alt=media',
  'empanadas-de-carne': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmunb2h67-nuqask.webp?alt=media',
  'cerveza-tirada-de-500': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Ffotos%2Fcerveza.webp?alt=media',
  'cerveza-tirada-l': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Ffotos%2Fcerveza.webp?alt=media',
  'cono-de-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun4s60p-gi9npl.webp?alt=media',
  'salchipapa': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fproductos%2Fmun4taax-34movx.webp?alt=media',
};

const FOTOS_PROMOS: Record<string, string> = {
  'sandwich-mila-carne-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fpromos%2Fsandwich-mila-carne-papas.webp?alt=media',
  'sandwich-mila-pollo-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fpromos%2Fsandwich-mila-pollo-papas.webp?alt=media',
  'lomo-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fpromos%2Flomo-papas.webp?alt=media',
  'hamburguesa-xl-carne-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fpromos%2Fhamburguesa-xl-carne-papas.webp?alt=media',
  'choripan-papas': 'https://firebasestorage.googleapis.com/v0/b/silverio-club.firebasestorage.app/o/imagenes%2Fpromos%2Fchoripan-papas.webp?alt=media',
};

function idDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function main() {
  const seed = JSON.parse(readFileSync('silverio/seed.json', 'utf8'));

  console.log('🔄 Actualizando carta en Firestore (silverio-club)...');

  // 1. Categorías
  const catDocs = await db.collection('categorias').listDocuments();
  for (const doc of catDocs) await doc.delete();

  const batchCat = db.batch();
  for (const c of seed.categorias) {
    const data = categoriaSchema.parse({
      nombre: c.nombre,
      orden: c.orden,
      visible: true,
      ...(c.icono ? { icono: c.icono } : {}),
    });
    batchCat.set(db.doc(`categorias/${c.id}`), data);
  }
  await batchCat.commit();
  console.log(`✅ ${seed.categorias.length} categorías cargadas.`);

  // 2. Productos
  const prodDocs = await db.collection('productos').listDocuments();
  for (const doc of prodDocs) await doc.delete();

  const batchProd = db.batch();
  for (const p of seed.productos) {
    const id = idDe(p.nombre);
    const fotoUrl = FOTOS_STORAGE[id];
    const data = productoSchema.parse({
      categoriaId: p.categoriaId,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      orden: p.orden,
      visible: true,
      disponible: true,
      estacion: p.estacion ?? (p.categoriaId === 'bebidas' ? 'barra' : 'cocina'),
      ...(fotoUrl ? { fotoUrl } : {}),
    });
    batchProd.set(db.doc(`productos/${id}`), { ...data, actualizadoEn: ahora });
  }
  await batchProd.commit();
  console.log(`✅ ${seed.productos.length} productos cargados.`);

  // 3. Promos
  const promoDocs = await db.collection('promos').listDocuments();
  for (const doc of promoDocs) await doc.delete();

  const batchPromo = db.batch();
  for (const pr of seed.promos) {
    const id = idDe(pr.titulo);
    const fotoUrl = FOTOS_PROMOS[id];
    const data = promoSchema.parse({
      titulo: pr.titulo,
      descripcion: pr.descripcion,
      precio: pr.precio,
      orden: pr.orden,
      activa: true,
      ...(fotoUrl ? { fotoUrl } : {}),
    });
    batchPromo.set(db.doc(`promos/${id}`), data);
  }
  await batchPromo.commit();
  console.log(`✅ ${seed.promos.length} promos cargadas.`);

  console.log('🎉 Carta actualizada exitosamente en producción.');
}

main().catch((err) => {
  console.error('❌ Error subiendo la carta:', err);
  process.exit(1);
});

