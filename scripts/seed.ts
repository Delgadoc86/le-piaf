/**
 * Carga el local desde su kit (<kit>/seed.json + <kit>/assets; por defecto silverio/) y su equipo.
 * Es idempotente: se puede correr las veces que quieras (pisa los documentos).
 *
 *   pnpm seed                                          → emuladores (default)
 *   pnpm seed --proyecto silverio-club --si-estoy-seguro --dueno <email>   → producción
 *
 * En producción: crea SOLO al dueño (sin usuarios de prueba) y le genera un link para elegir
 * su contraseña. Si el local ya tiene datos, no pisa nada salvo con --pisar (así nunca se
 * borra lo que el dueño cargó desde el panel).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  categoriaSchema,
  localEditableSchema,
  productoSchema,
  promoSchema,
  DOC_LOCAL,
  type ClaimsLocal,
  type LocalEditable,
  type ProductoDatos,
  type PromoDatos,
  type Rol,
} from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { arg, auth, db, destino, flag, KIT, usaEmuladores } from './entorno.ts';
import { subirAssets } from './subir-assets.ts';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const CONTRASENA = 'local123';
const ahora = FieldValue.serverTimestamp();

// ─── Tipos del seed.json (el kit del local: todo lo propio del local vive ahí) ──

interface SeedJson {
  local: {
    nombre: string;
    nombreCorto: string;
    bajada: string;
    descripcionCorta: string;
    zonaHoraria: string;
    contacto: { whatsapp: string; instagram?: string; facebook?: string };
    direccion: {
      calle: string;
      localidad: string;
      departamento: string;
      provincia: string;
      codigoPostal: string;
      pais: string;
      googleMapsUrl: string;
      geo: { lat: number; lng: number };
    };
    horarios: { dias: number[]; desde: string; hasta: string }[];
    marca: Record<string, string>;
    /** Textos de la web; las fotos van como rutas relativas a <kit>/assets. */
    web: LocalEditable['web'];
    pedidos: LocalEditable['pedidos'];
    pagos: LocalEditable['pagos'];
  };
  categorias: { id: string; nombre: string; orden: number; icono?: string }[];
  productos: {
    categoriaId: string;
    nombre: string;
    descripcion: string;
    precio: number;
    orden: number;
    _variantesSugeridas?: string[];
  }[];
  promos: { titulo: string; descripcion: string; precio: number; foto?: string; orden: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "Sándwich de milanesa" → "sandwich-de-milanesa" */
function idDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Valida con el esquema de @app/shared: si el seed tiene un dato mal, falla acá y no en la app. */
function validar<T>(esquema: { parse(d: unknown): T }, datos: unknown, que: string): T {
  try {
    return esquema.parse(datos);
  } catch (e) {
    console.error(`❌ Dato inválido en ${que}:`, e);
    process.exit(1);
  }
}

/** Links para elegir contraseña (producción): se muestran al final para mandarlos por WhatsApp. */
const linksContrasena: string[] = [];

async function usuario(email: string, nombre: string, claims: ClaimsLocal): Promise<string> {
  const existente = await auth.getUserByEmail(email).catch(() => null);
  const u =
    existente ??
    (await auth.createUser(
      usaEmuladores
        ? { email, password: CONTRASENA, displayName: nombre, emailVerified: true }
        : { email, displayName: nombre },
    ));
  if (!usaEmuladores && !existente) {
    linksContrasena.push(`${email}: ${await auth.generatePasswordResetLink(email)}`);
  }
  // Se setean acá para no depender de que el emulador de Functions esté corriendo;
  // en la app real los mantiene sincronizarClaims.
  await auth.setCustomUserClaims(u.uid, claims);
  await db.doc(`usuarios/${u.uid}`).set({ email, nombre, claimsVersion: 1 }, { merge: true });
  return u.uid;
}

async function guardarLocal(
  datos: LocalEditable,
  equipo: { email: string; nombre: string; rol: Rol }[],
): Promise<void> {
  const local = validar(localEditableSchema, datos, DOC_LOCAL);
  if (!equipo.some((m) => m.rol === 'dueno')) throw new Error('El local no tiene dueño');
  await db.doc(DOC_LOCAL).set({ ...local, actualizadoEn: ahora });
  for (const m of equipo) {
    const uid = await usuario(m.email, m.nombre, { rol: m.rol });
    await db
      .doc(`miembros/${uid}`)
      .set({ rol: m.rol, nombre: m.nombre, email: m.email, activo: true, creadoEn: ahora });
  }
}

/** Borra una colección entera (para que el seed no deje productos viejos). */
async function vaciar(ruta: string): Promise<void> {
  const docs = await db.collection(ruta).listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
}

async function cargarCarta(
  categorias: ({ id: string } & Record<string, unknown>)[],
  productos: ({ id: string } & ProductoDatos)[],
  promos: ({ id: string } & PromoDatos)[],
): Promise<void> {
  for (const col of ['categorias', 'productos', 'promos']) await vaciar(col);
  const batch = db.batch();
  for (const { id, ...c } of categorias) {
    batch.set(db.doc(`categorias/${id}`), validar(categoriaSchema, c, `categoria ${id}`));
  }
  for (const { id, ...p } of productos) {
    batch.set(db.doc(`productos/${id}`), {
      ...validar(productoSchema, p, `producto ${id}`),
      actualizadoEn: ahora,
    });
  }
  for (const { id, ...p } of promos) {
    batch.set(db.doc(`promos/${id}`), validar(promoSchema, p, `promo ${id}`));
  }
  await batch.commit();
}

// ─── Local ────────────────────────────────────────────────────────────────────

async function seedLocal(): Promise<void> {
  const seed = JSON.parse(readFileSync(`${raiz}${KIT}/seed.json`, 'utf8')) as SeedJson;
  const { local: s } = seed;

  console.log(`  · subiendo assets de ${KIT}/…`);
  const url = await subirAssets();
  const foto = (rel: string | undefined) => (rel ? (url.get(rel) ?? '') : '');

  const local: LocalEditable = {
    nombre: s.nombre,
    nombreCorto: s.nombreCorto,
    bajada: s.bajada,
    descripcionCorta: s.descripcionCorta,
    activo: true,
    zonaHoraria: s.zonaHoraria,
    contacto: {
      whatsapp: s.contacto.whatsapp,
      ...(s.contacto.instagram ? { instagram: s.contacto.instagram } : {}),
      ...(s.contacto.facebook ? { facebook: s.contacto.facebook } : {}),
    },
    direccion: {
      calle: s.direccion.calle,
      localidad: s.direccion.localidad,
      departamento: s.direccion.departamento,
      provincia: s.direccion.provincia,
      cp: s.direccion.codigoPostal,
      pais: s.direccion.pais,
      geo: s.direccion.geo,
      googleMapsUrl: s.direccion.googleMapsUrl,
    },
    horarios: s.horarios,
    cierresEspeciales: [],
    marca: {
      colorPrimario: s.marca.colorPrimario!,
      colorPrimarioHover: s.marca.colorPrimarioHover!,
      colorFondo: s.marca.colorFondo!,
      colorSuperficie: s.marca.colorSuperficie!,
      colorTexto: s.marca.colorTexto!,
      colorTextoSecundario: s.marca.colorTextoSecundario!,
      fuenteTitulos: s.marca.fuenteTitulos as LocalEditable['marca']['fuenteTitulos'],
      fuenteTexto: s.marca.fuenteTexto as LocalEditable['marca']['fuenteTexto'],
      logoUrl: foto(s.marca.logo),
      faviconUrl: foto(s.marca.logoSvg),
      ogImageUrl: '', // se genera sola (opengraph-image.tsx); el logo no tiene la proporción 1200×630
      heroDesktopUrl: foto(s.marca.heroDesktop),
      heroMovilUrl: foto(s.marca.heroMovil),
    },
    web: {
      ...s.web,
      nosotros: { ...s.web.nosotros, fotoUrl: foto(s.web.nosotros.fotoUrl) },
      galeria: s.web.galeria.map((g) => ({ ...g, fotoUrl: foto(g.fotoUrl) })),
    },
    pedidos: s.pedidos,
    pagos: {
      ...s.pagos,
      // En los emuladores, transferencia habilitada con un alias de prueba (para probar el checkout).
      ...(usaEmuladores && !s.pagos.transferencia.alias
        ? { transferencia: { habilitado: true, alias: 'local.demo', titular: 'Local (prueba)' } }
        : {}),
    },
  };

  // Equipo de prueba. Con datos reales, el dueño invita al resto desde Panel → Equipo.
  await guardarLocal(
    local,
    usaEmuladores
      ? [
          { email: 'dueno@local.test', nombre: 'Dueño (prueba)', rol: 'dueno' },
          { email: 'encargado@local.test', nombre: 'Encargado (prueba)', rol: 'encargado' },
          { email: 'mozo@local.test', nombre: 'Mozo (prueba)', rol: 'mozo' },
          { email: 'cocina@local.test', nombre: 'Cocina (prueba)', rol: 'cocina' },
        ]
      : [{ email: DUENO!, nombre: 'Dueño', rol: 'dueno' }],
  );

  const productos = seed.productos.map((p) => {
    const variantes = p._variantesSugeridas?.map((nombre) => ({
      id: idDe(nombre),
      nombre,
      precio: p.precio,
    }));
    return {
      id: idDe(p.nombre),
      categoriaId: p.categoriaId,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      orden: p.orden,
      visible: true,
      disponible: true,
      estacion: 'cocina' as const,
      ...(variantes ? { variantes } : {}),
    };
  });

  const promos = seed.promos.map((p) => ({
    id: idDe(p.titulo),
    titulo: p.titulo,
    descripcion: p.descripcion,
    precio: p.precio,
    orden: p.orden,
    activa: true,
    ...(p.foto ? { fotoUrl: foto(p.foto) } : {}),
  }));

  const categorias = seed.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    orden: c.orden,
    visible: true,
    ...(c.icono ? { icono: c.icono } : {}),
  }));

  await cargarCarta(categorias, productos, promos);
  console.log(
    `  ✓ ${s.nombre}: ${categorias.length} categorías, ${productos.length} productos, ${promos.length} promos`,
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DUENO = arg('dueno')?.trim().toLowerCase();
if (!usaEmuladores) {
  if (!DUENO || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(DUENO)) {
    console.error('✋ En producción hay que indicar el email del dueño: --dueno <email>');
    process.exit(1);
  }
  if ((await db.doc(DOC_LOCAL).get()).exists && !flag('pisar')) {
    console.error(
      '✋ El local ya tiene datos en producción. Para reemplazarlos TODOS, repetí con --pisar.',
    );
    process.exit(1);
  }
}

console.log(`🌱 Seed en ${destino()}`);
await seedLocal();
if (usaEmuladores) {
  console.log(`
✅ Listo. Usuarios (contraseña "${CONTRASENA}"):
   dueno@local.test · encargado@local.test · mozo@local.test · cocina@local.test`);
} else {
  console.log(`
✅ Listo. Dueño: ${DUENO}`);
  for (const l of linksContrasena) console.log(`   Link para elegir contraseña → ${l}`);
  if (linksContrasena.length === 0)
    console.log('   (el usuario ya existía: entra con su contraseña de siempre)');
}
process.exit(0);
