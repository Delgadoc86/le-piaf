/**
 * Carga el local "silverio" (desde silverio/seed.json + assets) y un local "demo".
 * Es idempotente: se puede correr las veces que quieras (pisa los documentos).
 *
 *   pnpm seed                                  → emuladores (default)
 *   pnpm seed --proyecto mimenu-dev --si-estoy-seguro
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  categoriaSchema,
  localEditableSchema,
  localPorDefecto,
  productoSchema,
  promoSchema,
  type ClaimsMiMenu,
  type LocalEditable,
  type ProductoDatos,
  type PromoDatos,
  type Rol,
} from '@mimenu/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { auth, db, destino } from './entorno.ts';
import { subirAssets } from './subir-assets.ts';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const CONTRASENA = 'mimenu123';
const ahora = FieldValue.serverTimestamp();

// ─── Tipos del seed.json (formato del proyecto viejo, ya normalizado) ─────────

interface SeedJson {
  local: {
    slug: string;
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

/** Valida con el esquema de @mimenu/shared: si el seed tiene un dato mal, falla acá y no en la app. */
function validar<T>(esquema: { parse(d: unknown): T }, datos: unknown, que: string): T {
  try {
    return esquema.parse(datos);
  } catch (e) {
    console.error(`❌ Dato inválido en ${que}:`, e);
    process.exit(1);
  }
}

async function usuario(email: string, nombre: string, claims: ClaimsMiMenu): Promise<string> {
  const existente = await auth.getUserByEmail(email).catch(() => null);
  const u =
    existente ?? (await auth.createUser({ email, password: CONTRASENA, displayName: nombre, emailVerified: true }));
  // Se setean acá para no depender de que el emulador de Functions esté corriendo;
  // en la app real los mantiene sincronizarClaims.
  await auth.setCustomUserClaims(u.uid, claims);
  await db.doc(`usuarios/${u.uid}`).set({ email, nombre, creadoEn: ahora, claimsVersion: 1 }, { merge: true });
  return u.uid;
}

async function crearLocal(
  localId: string,
  slug: string,
  datos: LocalEditable,
  equipo: { email: string; nombre: string; rol: Rol }[],
): Promise<void> {
  const local = validar(localEditableSchema, datos, `locales/${localId}`);
  const uids: { uid: string; email: string; nombre: string; rol: Rol }[] = [];
  for (const m of equipo) {
    uids.push({ ...m, uid: await usuario(m.email, m.nombre, { l: { [localId]: m.rol } }) });
  }
  const dueno = uids.find((m) => m.rol === 'dueno');
  if (!dueno) throw new Error(`El local ${localId} no tiene dueño`);

  await db.doc(`locales/${localId}`).set({
    ...local,
    slug,
    suscripcion: {
      plan: 'completo',
      estado: 'prueba',
      pruebaHasta: Timestamp.fromMillis(Date.now() + 365 * 24 * 3600 * 1000),
    },
    duenoUid: dueno.uid,
    creadoEn: ahora,
    actualizadoEn: ahora,
  });
  await db.doc(`slugs/${slug}`).set({ localId });
  for (const m of uids) {
    await db
      .doc(`locales/${localId}/miembros/${m.uid}`)
      .set({ rol: m.rol, nombre: m.nombre, email: m.email, activo: true, creadoEn: ahora });
  }
}

/** Borra una subcolección entera (para que el seed no deje productos viejos). */
async function vaciar(ruta: string): Promise<void> {
  const docs = await db.collection(ruta).listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
}

async function cargarCarta(
  localId: string,
  categorias: ({ id: string } & Record<string, unknown>)[],
  productos: ({ id: string } & ProductoDatos)[],
  promos: ({ id: string } & PromoDatos)[],
): Promise<void> {
  for (const col of ['categorias', 'productos', 'promos']) await vaciar(`locales/${localId}/${col}`);
  const batch = db.batch();
  for (const { id, ...c } of categorias) {
    batch.set(db.doc(`locales/${localId}/categorias/${id}`), validar(categoriaSchema, c, `categoria ${id}`));
  }
  for (const { id, ...p } of productos) {
    batch.set(db.doc(`locales/${localId}/productos/${id}`), {
      ...validar(productoSchema, p, `producto ${id}`),
      actualizadoEn: ahora,
    });
  }
  for (const { id, ...p } of promos) {
    batch.set(db.doc(`locales/${localId}/promos/${id}`), validar(promoSchema, p, `promo ${id}`));
  }
  await batch.commit();
}

// ─── Silverio ─────────────────────────────────────────────────────────────────

async function seedSilverio(): Promise<void> {
  const seed = JSON.parse(readFileSync(`${raiz}silverio/seed.json`, 'utf8')) as SeedJson;
  const { local: s } = seed;
  const localId = s.slug;

  console.log('  · subiendo assets de silverio…');
  const url = await subirAssets(localId);
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
      // Reproduce el lenguaje visual de la web actual (SILVERIO.md §1).
      estilo: {
        hero: 'pantalla_completa',
        promos: 'carrusel',
        carta: 'lista',
        nosotros: 'clasico',
        bordes: 'redondeado',
        titulosSeccion: 'overline',
        separadores: 'degradado',
        botones: 'pulso',
      },
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
          { icono: 'beer', titulo: 'Cerveza Tirada', texto: 'Disfruta de nuestras cervezas artesanales tiradas a la temperatura perfecta.' },
          { icono: 'utensils', titulo: 'Comidas al Plato', texto: 'Variedad de platos abundantes ideales para compartir con amigos.' },
          { icono: 'heart', titulo: 'Sabor Único', texto: 'Cada plato mantiene nuestro toque casero y auténtico que nos distingue.' },
          { icono: 'calendar', titulo: '4+ Años', texto: 'Más de cuatro años de experiencia sirviendo a nuestra comunidad.' },
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
        titulo: 'Silverio Food Truck Beer - Comida Casera y Cerveza Artesanal en Rodeo del Medio, Maipú',
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
      habilitados: false, // se habilitan en la Fase 2
      tipos: { takeAway: true, delivery: false, salon: false },
      tiempoEstimadoMin: 30,
      pedidoMinimo: 0,
      requiereConfirmacionMozoQR: true,
    },
    pagos: {
      efectivo: true,
      transferencia: { habilitado: false, alias: '', titular: '' }, // pendiente de confirmar
      mercadoPago: { habilitado: false, conectado: false },
    },
  };

  await crearLocal(localId, s.slug, local, [
    { email: 'dueno@silverio.test', nombre: 'Dueño Silverio', rol: 'dueno' },
    { email: 'encargado@silverio.test', nombre: 'Encargado Silverio', rol: 'encargado' },
    { email: 'mozo@silverio.test', nombre: 'Mozo Silverio', rol: 'mozo' },
    { email: 'cocina@silverio.test', nombre: 'Cocina Silverio', rol: 'cocina' },
  ]);

  const productos = seed.productos.map((p) => {
    const variantes = p._variantesSugeridas?.map((nombre) => ({ id: idDe(nombre), nombre, precio: p.precio }));
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

  await cargarCarta(localId, categorias, productos, promos);
  console.log(`  ✓ silverio: ${categorias.length} categorías, ${productos.length} productos, ${promos.length} promos`);
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function seedDemo(): Promise<void> {
  const localId = 'demo';
  const base = localPorDefecto({ nombre: 'La Esquina Demo' });
  await crearLocal(
    localId,
    'demo',
    {
      ...base,
      descripcionCorta: 'Local de demostración de MiMenu.',
      contacto: { whatsapp: '5492610000000' },
      horarios: [{ dias: [0, 1, 2, 3, 4, 5, 6], desde: '12:00', hasta: '00:00' }],
      // Deliberadamente distinto de Silverio: claro, verde, tarjetas y bordes rectos.
      marca: {
        ...base.marca,
        colorPrimario: '#15803d',
        colorPrimarioHover: '#166534',
        fuenteTitulos: 'Playfair Display',
        fuenteTexto: 'Inter',
      },
      web: {
        ...base.web,
        estilo: {
          hero: 'partido',
          promos: 'grilla',
          carta: 'tarjetas',
          nosotros: 'destacado',
          bordes: 'recto',
          titulosSeccion: 'simple',
          separadores: 'linea',
          botones: 'contorno',
        },
      },
      pedidos: { ...base.pedidos, habilitados: true, tipos: { takeAway: true, delivery: true, salon: true } },
    },
    [{ email: 'dueno@demo.test', nombre: 'Dueño Demo', rol: 'dueno' }],
  );

  await cargarCarta(
    localId,
    [
      { id: 'hamburguesas', nombre: 'Hamburguesas', orden: 1, visible: true },
      { id: 'bebidas', nombre: 'Bebidas', orden: 2, visible: true },
    ],
    [
      {
        id: 'clasica',
        categoriaId: 'hamburguesas',
        nombre: 'Hamburguesa clásica',
        descripcion: 'Medallón de 180 g, lechuga, tomate y aderezo de la casa.',
        precio: 0,
        orden: 1,
        visible: true,
        disponible: true,
        estacion: 'cocina',
        etiquetas: ['recomendado'],
        variantes: [
          { id: 'simple', nombre: 'Simple', precio: 8500 },
          { id: 'doble', nombre: 'Doble', precio: 11000 },
        ],
        gruposExtras: [
          {
            id: 'guarnicion',
            nombre: 'Guarnición',
            min: 1,
            max: 1,
            opciones: [
              { id: 'papas', nombre: 'Papas fritas', precio: 0, disponible: true },
              { id: 'batatas', nombre: 'Batatas fritas', precio: 800, disponible: true },
            ],
          },
          {
            id: 'extras',
            nombre: 'Agregados',
            min: 0,
            max: 3,
            opciones: [
              { id: 'cheddar', nombre: 'Cheddar', precio: 900, disponible: true },
              { id: 'bacon', nombre: 'Bacon', precio: 1200, disponible: true },
              { id: 'huevo', nombre: 'Huevo', precio: 600, disponible: false },
            ],
          },
        ],
      },
      {
        id: 'veggie',
        categoriaId: 'hamburguesas',
        nombre: 'Hamburguesa veggie',
        descripcion: 'Medallón de lentejas y quinoa.',
        precio: 9000,
        orden: 2,
        visible: true,
        disponible: false,
        estacion: 'cocina',
        etiquetas: ['vegetariano'],
      },
      {
        id: 'cerveza',
        categoriaId: 'bebidas',
        nombre: 'Cerveza tirada',
        descripcion: 'Pinta de 500 ml.',
        precio: 4500,
        orden: 1,
        visible: true,
        disponible: true,
        estacion: 'barra',
      },
    ],
    [
      {
        id: 'combo',
        titulo: 'Clásica + cerveza',
        descripcion: 'Hamburguesa clásica simple con papas y una pinta.',
        precio: 12000,
        orden: 1,
        activa: true,
        items: [
          { productoId: 'clasica', varianteId: 'simple', cantidad: 1 },
          { productoId: 'cerveza', cantidad: 1 },
        ],
        vigencia: { dias: [1, 2, 3, 4], desde: '19:00', hasta: '21:00' },
      },
    ],
  );
  console.log('  ✓ demo: 2 categorías, 3 productos, 1 promo');
}

// ─── Plataforma ───────────────────────────────────────────────────────────────

async function seedPlataforma(): Promise<void> {
  // Los precios reales se definen en la Fase 5.
  await db.doc('plataforma/config').set({
    diasPrueba: 14,
    planes: {
      carta: { nombre: 'Carta', precioMensual: 0, limites: { productos: 150, usuarios: 2, mesas: 0 }, features: [] },
      pedidos: {
        nombre: 'Pedidos',
        precioMensual: 0,
        limites: { productos: 300, usuarios: 5, mesas: 0 },
        features: ['pedidos_online', 'mercadopago'],
      },
      completo: {
        nombre: 'Completo',
        precioMensual: 0,
        limites: { productos: 1000, usuarios: 20, mesas: 60 },
        features: ['pedidos_online', 'mercadopago', 'salon', 'cocina', 'caja', 'reportes'],
      },
    },
  });
  await usuario('admin@mimenu.test', 'Superadmin', { sa: true });
  await db.doc('usuarios/' + (await auth.getUserByEmail('admin@mimenu.test')).uid).set({ superAdmin: true }, { merge: true });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`🌱 Seed en ${destino()}`);
await seedPlataforma();
await seedSilverio();
await seedDemo();
console.log(`\n✅ Listo. Usuarios (contraseña "${CONTRASENA}"):
   dueno@silverio.test · encargado@silverio.test · mozo@silverio.test · cocina@silverio.test
   dueno@demo.test · admin@mimenu.test (superadmin)`);
process.exit(0);
