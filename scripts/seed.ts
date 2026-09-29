/**
 * Carga el local desde su kit (<kit>/seed.json + <kit>/assets; por defecto silverio/) y su equipo.
 * Es idempotente: se puede correr las veces que quieras (pisa los documentos).
 *
 *   pnpm seed                                          → emuladores (default)
 *   pnpm seed --proyecto silverio-club --si-estoy-seguro
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
import { auth, db, destino, KIT } from './entorno.ts';
import { subirAssets } from './subir-assets.ts';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const CONTRASENA = 'local123';
const ahora = FieldValue.serverTimestamp();

// ─── Tipos del seed.json (formato del proyecto viejo, ya normalizado) ─────────

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

async function usuario(email: string, nombre: string, claims: ClaimsLocal): Promise<string> {
  const existente = await auth.getUserByEmail(email).catch(() => null);
  const u =
    existente ??
    (await auth.createUser({
      email,
      password: CONTRASENA,
      displayName: nombre,
      emailVerified: true,
    }));
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
      fuenteTitulos: 'Sriracha',
      fuenteTexto: 'Roboto',
      logoUrl: foto(s.marca.logo),
      faviconUrl: foto(s.marca.logoSvg),
      ogImageUrl: foto(s.marca.ogImage),
      heroDesktopUrl: foto(s.marca.heroDesktop),
      heroMovilUrl: foto(s.marca.heroMovil),
    },
    // Textos literales de la web actual (silverio/SILVERIO.md §3 y §5).
    web: {
      secciones: [
        { tipo: 'hero', visible: true, orden: 1 },
        { tipo: 'promos', visible: true, orden: 2 },
        { tipo: 'carta', visible: true, orden: 3 },
        { tipo: 'nosotros', visible: true, orden: 4 },
        { tipo: 'galeria', visible: true, orden: 5 },
        { tipo: 'ubicacion', visible: true, orden: 6 },
      ],
      hero: { bajada: 'FOOD TRUCK & BEER', titulo: 'SILVERIO', textoBoton: 'Ver Promos' },
      nosotros: {
        titulo: 'Nuestra Historia',
        parrafos: [
          'En Silverio Food Truck Beer, sabemos que la buena comida y una cerveza bien fría hacen la combinación perfecta. Hace más de cuatro años, comenzamos este camino con esfuerzo, dedicación y una meta clara: ofrecer a nuestros clientes una experiencia gastronómica única en Rodeo del Medio, Maipú.',
          'Desde el primer día, apostamos por la calidad, la atención y el compromiso con quienes nos eligen. Gracias a ustedes, hemos crecido, mejorado y perfeccionado cada plato, manteniendo siempre ese toque casero y auténtico que nos caracteriza.',
        ],
        fotoUrl: foto('assets/fotos/foodtruck.webp'),
        frase: 'Hoy somos "el food truck más completo para los fans de la comida"',
        tarjetas: [
          {
            icono: 'beer',
            titulo: 'Cerveza Tirada',
            texto: 'Disfruta de nuestras cervezas artesanales tiradas a la temperatura perfecta.',
          },
          {
            icono: 'utensils',
            titulo: 'Comidas al Plato',
            texto: 'Variedad de platos abundantes ideales para compartir con amigos.',
          },
          {
            icono: 'heart',
            titulo: 'Sabor Único',
            texto: 'Cada plato mantiene nuestro toque casero y auténtico que nos distingue.',
          },
          {
            icono: 'calendar',
            titulo: '4+ Años',
            texto: 'Más de cuatro años de experiencia sirviendo a nuestra comunidad.',
          },
        ],
        cierre:
          'Queremos seguir siendo parte de sus reuniones y noches especiales por muchos años más. ¡Nos vemos en Silverio Food Truck Beer para disfrutar juntos del buen sabor!',
      },
      galeria: [
        { fotoUrl: foto('assets/fotos/cerveza.webp'), titulo: 'Cerveza Tirada' },
        { fotoUrl: foto('assets/fotos/plato.webp'), titulo: 'Comidas al Plato' },
        { fotoUrl: foto('assets/fotos/lomo.webp'), titulo: 'Nuestros Lomos' },
      ],
      notaCarta:
        '*Consultar por delivery, según zona y disponibilidad. Los precios están sujetos a disponibilidad.',
      seo: {
        titulo:
          'Silverio Food Truck Beer - Comida Casera y Cerveza Artesanal en Rodeo del Medio, Maipú',
        descripcion:
          'Silverio Food Truck Beer: Más de cuatro años ofreciendo comida casera y cerveza artesanal en Rodeo del Medio, Maipú. Disfruta de nuestros platos únicos y cerveza tirada.',
        keywords: [
          'Silverio Food Truck',
          'comida casera',
          'cerveza artesanal',
          'Rodeo del Medio',
          'Maipú',
          'food truck',
          'promociones',
          'menú',
        ],
      },
      ga4Id: 'G-8CN2SBDQ5R',
    },
    pedidos: {
      habilitados: true, // carrito + pedido por WhatsApp (el dueño lo puede apagar desde el panel)
      tipos: { takeAway: true, delivery: false, salon: false },
      tiempoEstimadoMin: 30,
      pedidoMinimo: 0,
      requiereConfirmacionMozoQR: true,
    },
    pagos: {
      efectivo: true,
      transferencia: { habilitado: false, alias: '', titular: '' }, // pendiente de confirmar
      mercadoPago: { habilitado: false },
    },
  };

  // Equipo de prueba. Con datos reales, el dueño invita al resto desde Panel → Equipo.
  await guardarLocal(local, [
    { email: 'dueno@local.test', nombre: 'Dueño (prueba)', rol: 'dueno' },
    { email: 'encargado@local.test', nombre: 'Encargado (prueba)', rol: 'encargado' },
    { email: 'mozo@local.test', nombre: 'Mozo (prueba)', rol: 'mozo' },
    { email: 'cocina@local.test', nombre: 'Cocina (prueba)', rol: 'cocina' },
  ]);

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

console.log(`🌱 Seed en ${destino()}`);
await seedLocal();
console.log(`
✅ Listo. Usuarios (contraseña "${CONTRASENA}"):
   dueno@local.test · encargado@local.test · mozo@local.test · cocina@local.test`);
process.exit(0);
