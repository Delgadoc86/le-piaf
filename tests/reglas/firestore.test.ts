import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { como, crearEntorno, LOCAL_A, LOCAL_B, type NombreUsuario } from './entorno.js';

let env: RulesTestEnvironment;

const db = (u: NombreUsuario | null) => como(env, u).firestore();

const producto = {
  categoriaId: 'hamburguesas',
  nombre: 'Hamburguesa XL',
  descripcion: '',
  precio: 9000,
  orden: 1,
  visible: true,
  disponible: true,
  estacion: 'cocina',
};

const pedido = {
  numero: 1,
  tipo: 'take_away',
  origen: 'web',
  estado: 'pendiente',
  items: [],
  subtotal: 9000,
  descuento: 0,
  costoEnvio: 0,
  total: 9000,
  pagos: [],
  estadoPago: 'pendiente',
  seguimientoToken: 'tok123',
  contabilizado: false,
  historial: [],
};

beforeAll(async () => {
  env = await crearEntorno();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    for (const [localId, duenoUid] of [
      [LOCAL_A, 'duenoA'],
      [LOCAL_B, 'duenoB'],
    ] as const) {
      await setDoc(doc(f, 'locales', localId), {
        slug: localId,
        nombre: `Local ${localId}`,
        activo: true,
        duenoUid,
        suscripcion: { plan: 'completo', estado: 'prueba' },
      });
      await setDoc(doc(f, 'locales', localId, 'productos', 'p1'), producto);
      await setDoc(doc(f, 'locales', localId, 'categorias', 'c1'), { nombre: 'Hamburguesas', orden: 1, visible: true });
      await setDoc(doc(f, 'locales', localId, 'pedidos', 'ped1'), pedido);
      await setDoc(doc(f, 'locales', localId, 'pedidos', 'salon1'), { ...pedido, tipo: 'salon', estado: 'abierto' });
      await setDoc(doc(f, 'locales', localId, 'seguimiento', 'tok123'), { numero: 1, estado: 'pendiente' });
      await setDoc(doc(f, 'locales', localId, 'privado', 'mercadopago'), { accessToken: 'secreto' });
      await setDoc(doc(f, 'locales', localId, 'statsDiarias', '2026-10-02'), { ventas: 100 });
      await setDoc(doc(f, 'locales', localId, 'turnosCaja', 't1'), { estado: 'abierto' });
      await setDoc(doc(f, 'locales', localId, 'mesas', 'm1'), {
        nombre: 'Mesa 1',
        sector: 'Salón',
        capacidad: 4,
        orden: 1,
        estado: 'libre',
        qrToken: 'qr-secreto',
      });
      await setDoc(doc(f, 'locales', localId, 'clientes', '5492611234567'), { nombre: 'Juan' });
      await setDoc(doc(f, 'locales', localId, 'auditoria', 'a1'), { accion: 'x' });
      await setDoc(doc(f, 'locales', localId, 'contadores', '2026-10-02'), { ultimoNumero: 1 });
    }
    await setDoc(doc(f, 'locales', LOCAL_A, 'miembros', 'duenoA'), { rol: 'dueno', nombre: 'D', email: 'd@x', activo: true });
    await setDoc(doc(f, 'locales', LOCAL_A, 'miembros', 'mozoA'), { rol: 'mozo', nombre: 'M', email: 'm@x', activo: true });
    await setDoc(doc(f, 'usuarios', 'mozoA'), { email: 'mozoA@test.com', nombre: 'Mozo' });
    await setDoc(doc(f, 'slugs', LOCAL_A), { localId: LOCAL_A });
    await setDoc(doc(f, 'plataforma', 'config'), { diasPrueba: 14 });
  });
});

// ─── Caso crítico ─────────────────────────────────────────────────────────────

describe('aislamiento entre locales', () => {
  it('el dueño de A no lee ni escribe datos privados de B', async () => {
    const d = db('duenoA');
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'pedidos', 'ped1')));
    await assertFails(getDocs(collection(d, 'locales', LOCAL_B, 'pedidos')));
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'statsDiarias', '2026-10-02')));
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'mesas', 'm1')));
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'clientes', '5492611234567')));
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'turnosCaja', 't1')));
    await assertFails(getDoc(doc(d, 'locales', LOCAL_B, 'auditoria', 'a1')));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_B), { nombre: 'Hackeado' }));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_B, 'productos', 'p1'), { precio: 1 }));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_B, 'productos', 'p1'), { disponible: false }));
    await assertFails(setDoc(doc(d, 'locales', LOCAL_B, 'categorias', 'nueva'), { nombre: 'X', orden: 1, visible: true }));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_B, 'pedidos', 'ped1'), { estado: 'cancelado' }));
  });

  it('el staff de A no gestiona B aunque tenga rol en A', async () => {
    await assertFails(updateDoc(doc(db('mozoA'), 'locales', LOCAL_B, 'productos', 'p1'), { disponible: false }));
    await assertFails(getDoc(doc(db('cocinaA'), 'locales', LOCAL_B, 'pedidos', 'ped1')));
  });

  it('un usuario sin local no ve nada privado', async () => {
    await assertFails(getDoc(doc(db('sinLocal'), 'locales', LOCAL_A, 'pedidos', 'ped1')));
    await assertFails(getDoc(doc(db('sinLocal'), 'locales', LOCAL_A, 'miembros', 'duenoA')));
  });

  it('el superadmin puede leer cualquier local', async () => {
    await assertSucceeds(getDoc(doc(db('superAdmin'), 'locales', LOCAL_B, 'pedidos', 'ped1')));
    await assertSucceeds(getDoc(doc(db('superAdmin'), 'locales', LOCAL_B, 'auditoria', 'a1')));
  });
});

// ─── Raíz ─────────────────────────────────────────────────────────────────────

describe('usuarios', () => {
  it('cada uno lee solo su perfil', async () => {
    await assertSucceeds(getDoc(doc(db('mozoA'), 'usuarios', 'mozoA')));
    await assertFails(getDoc(doc(db('duenoA'), 'usuarios', 'mozoA')));
    await assertSucceeds(getDoc(doc(db('superAdmin'), 'usuarios', 'mozoA')));
  });

  it('crea su perfil con campos permitidos y sin superAdmin', async () => {
    const ok = { email: 'duenoA@test.com', nombre: 'Dueño', creadoEn: serverTimestamp() };
    await assertFails(setDoc(doc(db('duenoA'), 'usuarios', 'duenoA'), { ...ok, superAdmin: true }));
    await assertFails(setDoc(doc(db('duenoA'), 'usuarios', 'duenoA'), { ...ok, email: 'otro@test.com' }));
    await assertFails(setDoc(doc(db('duenoA'), 'usuarios', 'mozoA2'), ok));
    await assertSucceeds(setDoc(doc(db('duenoA'), 'usuarios', 'duenoA'), ok));
  });

  it('no puede darse superAdmin ni tocar claimsVersion', async () => {
    await assertFails(updateDoc(doc(db('mozoA'), 'usuarios', 'mozoA'), { superAdmin: true }));
    await assertFails(updateDoc(doc(db('mozoA'), 'usuarios', 'mozoA'), { claimsVersion: 9 }));
    await assertSucceeds(updateDoc(doc(db('mozoA'), 'usuarios', 'mozoA'), { nombre: 'Mozo Juan' }));
  });
});

describe('slugs y plataforma', () => {
  it('slug: get público, list y escritura prohibidos', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'slugs', LOCAL_A)));
    await assertFails(getDocs(collection(db(null), 'slugs')));
    await assertFails(setDoc(doc(db('duenoA'), 'slugs', 'robado'), { localId: LOCAL_A }));
  });

  it('plataforma: lectura pública, escritura solo Functions', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'plataforma', 'config')));
    await assertFails(setDoc(doc(db('superAdmin'), 'plataforma', 'config'), { diasPrueba: 999 }));
  });
});

// ─── Local ────────────────────────────────────────────────────────────────────

describe('locales', () => {
  it('lectura pública', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'locales', LOCAL_A)));
  });

  it('nadie crea ni borra locales desde el cliente', async () => {
    await assertFails(setDoc(doc(db('duenoA'), 'locales', 'nuevo'), { nombre: 'X', activo: true }));
    await assertFails(deleteDoc(doc(db('duenoA'), 'locales', LOCAL_A)));
  });

  it('el dueño edita su local pero no suscripción, dueño ni slug', async () => {
    const ref = doc(db('duenoA'), 'locales', LOCAL_A);
    await assertSucceeds(updateDoc(ref, { nombre: 'Silverio Beer' }));
    await assertFails(updateDoc(ref, { 'suscripcion.estado': 'activa' }));
    await assertFails(updateDoc(ref, { duenoUid: 'otro' }));
    await assertFails(updateDoc(ref, { slug: 'otro' }));
  });

  it('el encargado no edita la configuración del local', async () => {
    await assertFails(updateDoc(doc(db('encargadoA'), 'locales', LOCAL_A), { nombre: 'X' }));
  });

  it('privado: nadie lee ni escribe, ni el dueño ni el superadmin', async () => {
    await assertFails(getDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'privado', 'mercadopago')));
    await assertFails(getDoc(doc(db('superAdmin'), 'locales', LOCAL_A, 'privado', 'mercadopago')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'privado', 'mercadopago'), { accessToken: 'x' }));
  });
});

describe('miembros', () => {
  it('el gestor lee el equipo; cada miembro lee su propio doc', async () => {
    await assertSucceeds(getDocs(collection(db('encargadoA'), 'locales', LOCAL_A, 'miembros')));
    await assertSucceeds(getDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'miembros', 'mozoA')));
    await assertFails(getDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'miembros', 'duenoA')));
  });

  it('nadie se agrega a un local desde el cliente', async () => {
    const m = { rol: 'dueno', nombre: 'X', email: 'x@x', activo: true };
    await assertFails(setDoc(doc(db('duenoB'), 'locales', LOCAL_A, 'miembros', 'duenoB'), m));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'miembros', 'nuevo'), m));
  });

  it('el dueño cambia rol de otros, sin crear dueños ni tocarse a sí mismo', async () => {
    const d = db('duenoA');
    await assertSucceeds(updateDoc(doc(d, 'locales', LOCAL_A, 'miembros', 'mozoA'), { rol: 'encargado' }));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_A, 'miembros', 'mozoA'), { rol: 'dueno' }));
    await assertFails(updateDoc(doc(d, 'locales', LOCAL_A, 'miembros', 'duenoA'), { activo: false }));
    await assertFails(updateDoc(doc(db('encargadoA'), 'locales', LOCAL_A, 'miembros', 'mozoA'), { rol: 'cocina' }));
  });
});

// ─── Carta ────────────────────────────────────────────────────────────────────

describe('carta', () => {
  it('lectura pública de categorías, productos, promos y zonas', async () => {
    const d = db(null);
    await assertSucceeds(getDocs(collection(d, 'locales', LOCAL_A, 'categorias')));
    await assertSucceeds(getDocs(collection(d, 'locales', LOCAL_A, 'productos')));
    await assertSucceeds(getDocs(collection(d, 'locales', LOCAL_A, 'promos')));
    await assertSucceeds(getDocs(collection(d, 'locales', LOCAL_A, 'zonasDelivery')));
  });

  it('el público no escribe la carta', async () => {
    await assertFails(updateDoc(doc(db(null), 'locales', LOCAL_A, 'productos', 'p1'), { precio: 1 }));
    await assertFails(updateDoc(doc(db('sinLocal'), 'locales', LOCAL_A, 'productos', 'p1'), { disponible: false }));
  });

  it('gestores crean y editan productos válidos', async () => {
    const ref = doc(db('encargadoA'), 'locales', LOCAL_A, 'productos', 'p2');
    await assertSucceeds(setDoc(ref, producto));
    await assertSucceeds(updateDoc(ref, { precio: 9500 }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('valida el producto: precio entero, campos conocidos y estación', async () => {
    const ref = doc(db('duenoA'), 'locales', LOCAL_A, 'productos', 'p3');
    await assertFails(setDoc(ref, { ...producto, precio: 9000.5 }));
    await assertFails(setDoc(ref, { ...producto, precio: '9000' }));
    await assertFails(setDoc(ref, { ...producto, precio: -1 }));
    await assertFails(setDoc(ref, { ...producto, estacion: 'parrilla' }));
    await assertFails(setDoc(ref, { ...producto, campoRaro: true }));
    const { nombre: _nombre, ...sinNombre } = producto;
    await assertFails(setDoc(ref, sinNombre));
  });

  it('mozo y cocina solo marcan agotado', async () => {
    for (const u of ['mozoA', 'cocinaA'] as const) {
      const ref = doc(db(u), 'locales', LOCAL_A, 'productos', 'p1');
      await assertSucceeds(updateDoc(ref, { disponible: false, actualizadoEn: serverTimestamp() }));
      await assertFails(updateDoc(ref, { precio: 1 }));
      await assertFails(updateDoc(ref, { disponible: true, nombre: 'Otro' }));
      await assertFails(deleteDoc(ref));
    }
  });

  it('categorías, promos y zonas: solo gestores, con validación', async () => {
    const d = db('duenoA');
    await assertSucceeds(setDoc(doc(d, 'locales', LOCAL_A, 'categorias', 'c2'), { nombre: 'Pizzas', orden: 2, visible: true }));
    await assertFails(setDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'categorias', 'c3'), { nombre: 'X', orden: 3, visible: true }));
    await assertFails(setDoc(doc(d, 'locales', LOCAL_A, 'categorias', 'c4'), { nombre: '', orden: 1, visible: true }));

    const promo = { titulo: 'Lomo + papas', descripcion: '', precio: 14000, orden: 1, activa: true };
    await assertSucceeds(setDoc(doc(d, 'locales', LOCAL_A, 'promos', 'pr1'), promo));
    await assertFails(setDoc(doc(d, 'locales', LOCAL_A, 'promos', 'pr2'), { ...promo, precio: 1.5 }));
    await assertFails(setDoc(doc(db('cocinaA'), 'locales', LOCAL_A, 'promos', 'pr3'), promo));

    const zona = { nombre: 'Centro', costo: 1500, activa: true, orden: 1 };
    await assertSucceeds(setDoc(doc(d, 'locales', LOCAL_A, 'zonasDelivery', 'z1'), zona));
    await assertFails(setDoc(doc(d, 'locales', LOCAL_A, 'zonasDelivery', 'z2'), { ...zona, costo: -5 }));
    await assertFails(setDoc(doc(d, 'locales', LOCAL_A, 'zonasDelivery', 'z3'), { ...zona, pedidoMinimo: 'mucho' }));
  });
});

// ─── Salón ────────────────────────────────────────────────────────────────────

describe('mesas', () => {
  it('no son públicas (protege el qrToken)', async () => {
    await assertFails(getDoc(doc(db(null), 'locales', LOCAL_A, 'mesas', 'm1')));
    await assertSucceeds(getDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'mesas', 'm1')));
  });

  it('el mozo cambia estado pero no el qrToken', async () => {
    const ref = doc(db('mozoA'), 'locales', LOCAL_A, 'mesas', 'm1');
    await assertSucceeds(updateDoc(ref, { estado: 'ocupada', pedidoActualId: 'salon1' }));
    await assertFails(updateDoc(ref, { qrToken: 'otro' }));
    await assertFails(updateDoc(ref, { estado: 'rota' }));
    await assertFails(updateDoc(doc(db('cocinaA'), 'locales', LOCAL_A, 'mesas', 'm1'), { estado: 'ocupada' }));
  });
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────

describe('pedidos', () => {
  it('nadie crea pedidos desde el cliente (solo crearPedido)', async () => {
    await assertFails(addDoc(collection(db(null), 'locales', LOCAL_A, 'pedidos'), pedido));
    await assertFails(addDoc(collection(db('sinLocal'), 'locales', LOCAL_A, 'pedidos'), pedido));
    await assertFails(addDoc(collection(db('duenoA'), 'locales', LOCAL_A, 'pedidos'), pedido));
    await assertFails(deleteDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'pedidos', 'ped1')));
  });

  it('el público no lee pedidos', async () => {
    await assertFails(getDoc(doc(db(null), 'locales', LOCAL_A, 'pedidos', 'ped1')));
    await assertFails(getDocs(collection(db(null), 'locales', LOCAL_A, 'pedidos')));
  });

  it('el staff los lee', async () => {
    for (const u of ['duenoA', 'encargadoA', 'mozoA', 'cocinaA'] as const) {
      await assertSucceeds(getDocs(collection(db(u), 'locales', LOCAL_A, 'pedidos')));
    }
  });

  it('los gestores avanzan el estado pero no tocan precios ni número', async () => {
    const ref = doc(db('encargadoA'), 'locales', LOCAL_A, 'pedidos', 'ped1');
    await assertSucceeds(updateDoc(ref, { estado: 'aceptado', tiempoEstimadoMin: 30, actualizadoEn: serverTimestamp() }));
    await assertFails(updateDoc(ref, { total: 1 }));
    await assertFails(updateDoc(ref, { subtotal: 1 }));
    await assertFails(updateDoc(ref, { numero: 99 }));
    await assertFails(updateDoc(ref, { contabilizado: true }));
    await assertFails(updateDoc(ref, { seguimientoToken: 'otro' }));
    await assertFails(updateDoc(ref, { estado: 'inventado' }));
  });

  it('el mozo gestiona salón pero no pedidos web ajenos', async () => {
    await assertSucceeds(updateDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'pedidos', 'salon1'), { estado: 'cuenta_pedida' }));
    await assertFails(updateDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'pedidos', 'ped1'), { estado: 'aceptado' }));
  });

  it('cocina solo toca ítems (estado de cocina)', async () => {
    const ref = doc(db('cocinaA'), 'locales', LOCAL_A, 'pedidos', 'ped1');
    await assertSucceeds(updateDoc(ref, { items: [], actualizadoEn: serverTimestamp() }));
    await assertFails(updateDoc(ref, { estado: 'entregado' }));
    await assertFails(updateDoc(ref, { pagos: [{ medio: 'efectivo', monto: 9000, estado: 'aprobado' }] }));
  });
});

describe('seguimiento', () => {
  it('get público por token, list nunca', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'locales', LOCAL_A, 'seguimiento', 'tok123')));
    await assertFails(getDocs(collection(db(null), 'locales', LOCAL_A, 'seguimiento')));
    await assertFails(getDocs(collection(db('duenoA'), 'locales', LOCAL_A, 'seguimiento')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'seguimiento', 'x'), { estado: 'listo' }));
  });
});

// ─── Solo Functions ───────────────────────────────────────────────────────────

describe('colecciones que solo escriben las Functions', () => {
  it('contadores: nadie lee ni escribe', async () => {
    await assertFails(getDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'contadores', '2026-10-02')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'contadores', '2026-10-02'), { ultimoNumero: 0 }));
  });

  it('statsDiarias: leen gestores, escribe nadie', async () => {
    await assertSucceeds(getDoc(doc(db('encargadoA'), 'locales', LOCAL_A, 'statsDiarias', '2026-10-02')));
    await assertFails(getDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'statsDiarias', '2026-10-02')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'statsDiarias', '2026-10-02'), { ventas: 1e9 }));
  });

  it('clientes: leen gestores, escribe nadie', async () => {
    await assertSucceeds(getDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'clientes', '5492611234567')));
    await assertFails(getDoc(doc(db('cocinaA'), 'locales', LOCAL_A, 'clientes', '5492611234567')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'clientes', '1'), { nombre: 'X' }));
  });

  it('auditoria: solo el dueño la lee; nadie escribe', async () => {
    await assertSucceeds(getDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'auditoria', 'a1')));
    await assertFails(getDoc(doc(db('encargadoA'), 'locales', LOCAL_A, 'auditoria', 'a1')));
    await assertFails(setDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'auditoria', 'a2'), { accion: 'x' }));
  });
});

describe('caja', () => {
  const mov = () => ({
    tipo: 'egreso',
    categoria: 'proveedor',
    monto: 5000,
    detalle: 'Pan',
    porUid: 'encargadoA',
    en: serverTimestamp(),
  });
  const movs = (u: NombreUsuario) => collection(db(u), 'locales', LOCAL_A, 'turnosCaja', 't1', 'movimientos');

  it('turnos: leen gestores, escriben Functions', async () => {
    await assertSucceeds(getDoc(doc(db('encargadoA'), 'locales', LOCAL_A, 'turnosCaja', 't1')));
    await assertFails(getDoc(doc(db('mozoA'), 'locales', LOCAL_A, 'turnosCaja', 't1')));
    await assertFails(updateDoc(doc(db('duenoA'), 'locales', LOCAL_A, 'turnosCaja', 't1'), { estado: 'cerrado' }));
  });

  it('movimientos: el gestor los crea a su nombre; no se editan ni borran', async () => {
    const ref = await assertSucceeds(addDoc(movs('encargadoA'), mov()));
    await assertFails(addDoc(movs('encargadoA'), { ...mov(), porUid: 'duenoA' }));
    await assertFails(addDoc(movs('encargadoA'), { ...mov(), monto: 0 }));
    await assertFails(addDoc(movs('encargadoA'), { ...mov(), monto: 10.5 }));
    await assertFails(addDoc(movs('mozoA'), { ...mov(), porUid: 'mozoA' }));
    const d = db('encargadoA');
    await assertFails(updateDoc(doc(d, ref.path), { monto: 1 }));
    await assertFails(deleteDoc(doc(d, ref.path)));
  });
});
