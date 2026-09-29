import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  arrayUnion,
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
import { como, crearEntorno, type NombreUsuario } from './entorno.js';

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
  pagoElegido: { medio: 'efectivo' },
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
    await setDoc(doc(f, 'local', 'datos'), { nombre: 'Silverio', activo: true });
    await setDoc(doc(f, 'productos', 'p1'), producto);
    await setDoc(doc(f, 'categorias', 'c1'), { nombre: 'Hamburguesas', orden: 1, visible: true });
    await setDoc(doc(f, 'pedidos', 'ped1'), pedido);
    await setDoc(doc(f, 'pedidos', 'salon1'), { ...pedido, tipo: 'salon', estado: 'abierto' });
    await setDoc(doc(f, 'pedidos', 'delivery1'), { ...pedido, tipo: 'delivery' });
    await setDoc(doc(f, 'pedidos', 'mostrador1'), {
      ...pedido,
      origen: 'mostrador',
      estado: 'en_preparacion',
      mozoUid: 'mozo',
    });
    await setDoc(doc(f, 'seguimiento', 'tok123'), { numero: 1, estado: 'pendiente' });
    await setDoc(doc(f, 'privado', 'mercadopago'), { accessToken: 'secreto' });
    await setDoc(doc(f, 'statsDiarias', '2026-10-02'), { ventas: 100 });
    await setDoc(doc(f, 'turnosCaja', 't1'), { estado: 'abierto' });
    await setDoc(doc(f, 'turnosCaja', 't2'), { estado: 'cerrado' });
    await setDoc(doc(f, 'mesas', 'm1'), {
      nombre: 'Mesa 1',
      sector: 'Salón',
      capacidad: 4,
      orden: 1,
      estado: 'libre',
      qrToken: 'qr-secreto',
    });
    await setDoc(doc(f, 'clientes', '5492611234567'), { nombre: 'Juan' });
    await setDoc(doc(f, 'auditoria', 'a1'), { accion: 'x' });
    await setDoc(doc(f, 'contadores', '2026-10-02'), { ultimoNumero: 1 });
    await setDoc(doc(f, 'miembros', 'dueno'), {
      rol: 'dueno',
      nombre: 'D',
      email: 'd@x',
      activo: true,
    });
    await setDoc(doc(f, 'miembros', 'mozo'), {
      rol: 'mozo',
      nombre: 'M',
      email: 'm@x',
      activo: true,
    });
    await setDoc(doc(f, 'usuarios', 'mozo'), {
      email: 'mozo@test.com',
      nombre: 'Mozo',
      claimsVersion: 1,
    });
  });
});

// ─── Caso crítico ─────────────────────────────────────────────────────────────

describe('usuarios sin rol (cualquiera que entre con Google) y anónimos', () => {
  for (const u of ['sinRol', 'rolInvalido', null] as const) {
    it(`${u ?? 'anónimo'} no lee ni escribe nada privado`, async () => {
      const d = db(u);
      await assertFails(getDoc(doc(d, 'pedidos', 'ped1')));
      await assertFails(getDocs(collection(d, 'pedidos')));
      await assertFails(getDoc(doc(d, 'statsDiarias', '2026-10-02')));
      await assertFails(getDoc(doc(d, 'mesas', 'm1')));
      await assertFails(getDoc(doc(d, 'clientes', '5492611234567')));
      await assertFails(getDoc(doc(d, 'turnosCaja', 't1')));
      await assertFails(getDoc(doc(d, 'auditoria', 'a1')));
      await assertFails(getDocs(collection(d, 'miembros')));
      await assertFails(updateDoc(doc(d, 'local', 'datos'), { nombre: 'Hackeado' }));
      await assertFails(updateDoc(doc(d, 'productos', 'p1'), { precio: 1 }));
      await assertFails(updateDoc(doc(d, 'productos', 'p1'), { disponible: false }));
      await assertFails(
        setDoc(doc(d, 'categorias', 'nueva'), { nombre: 'X', orden: 1, visible: true }),
      );
      await assertFails(updateDoc(doc(d, 'pedidos', 'ped1'), { estado: 'cancelado' }));
    });
  }

  it('nadie se da un rol a sí mismo', async () => {
    const m = { rol: 'dueno', nombre: 'X', email: 'x@x', activo: true };
    await assertFails(setDoc(doc(db('sinRol'), 'miembros', 'sinRol'), m));
    await assertFails(setDoc(doc(db('mozo'), 'miembros', 'mozo2'), m));
  });
});

// ─── Local y sesión ───────────────────────────────────────────────────────────

describe('local/datos', () => {
  it('lectura pública', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'local', 'datos')));
  });

  it('solo el dueño lo edita; nadie lo crea ni lo borra', async () => {
    await assertSucceeds(
      updateDoc(doc(db('dueno'), 'local', 'datos'), { nombre: 'Silverio Club' }),
    );
    await assertFails(updateDoc(doc(db('encargado'), 'local', 'datos'), { nombre: 'X' }));
    await assertFails(updateDoc(doc(db('dueno'), 'local', 'datos'), { nombre: '' }));
    await assertFails(setDoc(doc(db('dueno'), 'local', 'otro'), { nombre: 'X', activo: true }));
    await assertFails(deleteDoc(doc(db('dueno'), 'local', 'datos')));
  });
});

describe('usuarios', () => {
  it('cada uno lee solo su perfil y nadie lo escribe desde el cliente', async () => {
    await assertSucceeds(getDoc(doc(db('mozo'), 'usuarios', 'mozo')));
    await assertFails(getDoc(doc(db('dueno'), 'usuarios', 'mozo')));
    await assertFails(updateDoc(doc(db('mozo'), 'usuarios', 'mozo'), { claimsVersion: 9 }));
    await assertFails(setDoc(doc(db('sinRol'), 'usuarios', 'sinRol'), { email: 'x', nombre: 'x' }));
  });
});

describe('privado', () => {
  it('nadie lee ni escribe, ni el dueño', async () => {
    await assertFails(getDoc(doc(db('dueno'), 'privado', 'mercadopago')));
    await assertFails(setDoc(doc(db('dueno'), 'privado', 'mercadopago'), { accessToken: 'x' }));
  });
});

describe('miembros', () => {
  it('el gestor lee el equipo; cada miembro lee su propio doc', async () => {
    await assertSucceeds(getDocs(collection(db('encargado'), 'miembros')));
    await assertSucceeds(getDoc(doc(db('mozo'), 'miembros', 'mozo')));
    await assertFails(getDoc(doc(db('mozo'), 'miembros', 'dueno')));
  });

  it('el dueño cambia rol de otros, sin crear dueños ni tocarse a sí mismo', async () => {
    await assertSucceeds(updateDoc(doc(db('dueno'), 'miembros', 'mozo'), { rol: 'encargado' }));
    await assertFails(updateDoc(doc(db('dueno'), 'miembros', 'mozo'), { rol: 'dueno' }));
    await assertFails(updateDoc(doc(db('dueno'), 'miembros', 'dueno'), { activo: false }));
    await assertFails(updateDoc(doc(db('encargado'), 'miembros', 'mozo'), { rol: 'cocina' }));
  });
});

// ─── Carta ────────────────────────────────────────────────────────────────────

describe('carta', () => {
  it('lectura pública de categorías, productos, promos y zonas', async () => {
    const d = db(null);
    await assertSucceeds(getDocs(collection(d, 'categorias')));
    await assertSucceeds(getDocs(collection(d, 'productos')));
    await assertSucceeds(getDocs(collection(d, 'promos')));
    await assertSucceeds(getDocs(collection(d, 'zonasDelivery')));
  });

  it('gestores crean y editan productos válidos', async () => {
    const ref = doc(db('encargado'), 'productos', 'p2');
    await assertSucceeds(setDoc(ref, producto));
    await assertSucceeds(updateDoc(ref, { precio: 9500 }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('valida el producto: precio entero, campos conocidos y estación', async () => {
    const ref = doc(db('dueno'), 'productos', 'p3');
    await assertFails(setDoc(ref, { ...producto, precio: 9000.5 }));
    await assertFails(setDoc(ref, { ...producto, precio: '9000' }));
    await assertFails(setDoc(ref, { ...producto, precio: -1 }));
    await assertFails(setDoc(ref, { ...producto, estacion: 'parrilla' }));
    await assertFails(setDoc(ref, { ...producto, campoRaro: true }));
    const { nombre: _nombre, ...sinNombre } = producto;
    await assertFails(setDoc(ref, sinNombre));
  });

  it('mozo y cocina solo marcan agotado', async () => {
    for (const u of ['mozo', 'cocina'] as const) {
      const ref = doc(db(u), 'productos', 'p1');
      await assertSucceeds(updateDoc(ref, { disponible: false, actualizadoEn: serverTimestamp() }));
      await assertFails(updateDoc(ref, { precio: 1 }));
      await assertFails(updateDoc(ref, { disponible: true, nombre: 'Otro' }));
      await assertFails(deleteDoc(ref));
    }
  });

  it('categorías, promos y zonas: solo gestores, con validación', async () => {
    const d = db('dueno');
    await assertSucceeds(
      setDoc(doc(d, 'categorias', 'c2'), { nombre: 'Pizzas', orden: 2, visible: true }),
    );
    await assertFails(
      setDoc(doc(db('mozo'), 'categorias', 'c3'), { nombre: 'X', orden: 3, visible: true }),
    );
    await assertFails(setDoc(doc(d, 'categorias', 'c4'), { nombre: '', orden: 1, visible: true }));

    const promo = {
      titulo: 'Lomo + papas',
      descripcion: '',
      precio: 14000,
      orden: 1,
      activa: true,
    };
    await assertSucceeds(setDoc(doc(d, 'promos', 'pr1'), promo));
    await assertFails(setDoc(doc(d, 'promos', 'pr2'), { ...promo, precio: 1.5 }));
    await assertFails(setDoc(doc(db('cocina'), 'promos', 'pr3'), promo));

    const zona = { nombre: 'Centro', costo: 1500, activa: true, orden: 1 };
    await assertSucceeds(setDoc(doc(d, 'zonasDelivery', 'z1'), zona));
    await assertFails(setDoc(doc(d, 'zonasDelivery', 'z2'), { ...zona, costo: -5 }));
    await assertFails(setDoc(doc(d, 'zonasDelivery', 'z3'), { ...zona, pedidoMinimo: 'mucho' }));
  });
});

// ─── Salón ────────────────────────────────────────────────────────────────────

describe('mesas', () => {
  it('no son públicas (protege el qrToken)', async () => {
    await assertFails(getDoc(doc(db(null), 'mesas', 'm1')));
    await assertSucceeds(getDoc(doc(db('mozo'), 'mesas', 'm1')));
  });

  it('el mozo cambia estado pero no el qrToken', async () => {
    const ref = doc(db('mozo'), 'mesas', 'm1');
    await assertSucceeds(updateDoc(ref, { estado: 'ocupada', pedidoActualId: 'salon1' }));
    await assertFails(updateDoc(ref, { qrToken: 'otro' }));
    await assertFails(updateDoc(ref, { estado: 'rota' }));
    await assertFails(updateDoc(doc(db('cocina'), 'mesas', 'm1'), { estado: 'ocupada' }));
  });
});

// ─── Pedidos ──────────────────────────────────────────────────────────────────

describe('pedidos', () => {
  it('nadie crea pedidos desde el cliente (solo crearPedido)', async () => {
    await assertFails(addDoc(collection(db(null), 'pedidos'), pedido));
    await assertFails(addDoc(collection(db('sinRol'), 'pedidos'), pedido));
    await assertFails(addDoc(collection(db('dueno'), 'pedidos'), pedido));
    await assertFails(deleteDoc(doc(db('dueno'), 'pedidos', 'ped1')));
  });

  it('el staff los lee', async () => {
    for (const u of ['dueno', 'encargado', 'mozo', 'cocina'] as const) {
      await assertSucceeds(getDocs(collection(db(u), 'pedidos')));
    }
  });

  it('los gestores avanzan el estado pero no tocan precios ni número', async () => {
    const ref = doc(db('encargado'), 'pedidos', 'ped1');
    await assertSucceeds(
      updateDoc(ref, {
        estado: 'aceptado',
        tiempoEstimadoMin: 30,
        actualizadoEn: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(ref, { total: 1 }));
    await assertFails(updateDoc(ref, { subtotal: 1 }));
    await assertFails(updateDoc(ref, { numero: 99 }));
    await assertFails(updateDoc(ref, { contabilizado: true }));
    await assertFails(updateDoc(ref, { seguimientoToken: 'otro' }));
    await assertFails(updateDoc(ref, { estado: 'inventado' }));
  });

  it('el panel registra cambios de estado con historial y cobros manuales', async () => {
    const ref = doc(db('dueno'), 'pedidos', 'ped1');
    await assertSucceeds(
      updateDoc(ref, {
        estado: 'en_preparacion',
        historial: arrayUnion({ estado: 'en_preparacion', en: new Date(), porUid: 'dueno' }),
        actualizadoEn: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(ref, {
        pagos: [{ medio: 'transferencia', monto: 9000, estado: 'aprobado', porUid: 'dueno' }],
        estadoPago: 'pagado',
        actualizadoEn: serverTimestamp(),
      }),
    );
    await assertSucceeds(updateDoc(ref, { estado: 'cancelado', motivoCancelacion: 'Sin stock' }));
    // Lo que eligió el cliente y los datos del pedido no se reescriben desde el panel.
    await assertFails(updateDoc(ref, { pagoElegido: { medio: 'transferencia' } }));
    await assertFails(updateDoc(ref, { cliente: { nombre: 'Otro' } }));
  });

  it('el costo de envío se carga solo en delivery y con el total bien calculado', async () => {
    const ref = doc(db('encargado'), 'pedidos', 'delivery1');
    await assertSucceeds(updateDoc(ref, { costoEnvio: 1500, total: 10500 }));
    await assertFails(updateDoc(ref, { costoEnvio: 1500, total: 5 }));
    await assertFails(updateDoc(ref, { costoEnvio: -100, total: 8900 }));
    await assertFails(updateDoc(ref, { costoEnvio: 1500.5, total: 10500.5 }));
    await assertFails(
      updateDoc(doc(db('encargado'), 'pedidos', 'ped1'), { costoEnvio: 1500, total: 10500 }),
    );
  });

  it('el mozo gestiona salón y los pedidos que cargó él, pero no pedidos web ajenos', async () => {
    await assertSucceeds(
      updateDoc(doc(db('mozo'), 'pedidos', 'salon1'), { estado: 'cuenta_pedida' }),
    );
    await assertSucceeds(updateDoc(doc(db('mozo'), 'pedidos', 'mostrador1'), { estado: 'listo' }));
    await assertFails(updateDoc(doc(db('mozo'), 'pedidos', 'ped1'), { estado: 'aceptado' }));
  });

  it('cocina solo toca ítems (estado de cocina)', async () => {
    const ref = doc(db('cocina'), 'pedidos', 'ped1');
    await assertSucceeds(updateDoc(ref, { items: [], actualizadoEn: serverTimestamp() }));
    await assertFails(updateDoc(ref, { estado: 'entregado' }));
    await assertFails(
      updateDoc(ref, { pagos: [{ medio: 'efectivo', monto: 9000, estado: 'aprobado' }] }),
    );
  });
});

describe('seguimiento', () => {
  it('get público por token, list nunca', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'seguimiento', 'tok123')));
    await assertFails(getDocs(collection(db(null), 'seguimiento')));
    await assertFails(getDocs(collection(db('dueno'), 'seguimiento')));
    await assertFails(setDoc(doc(db('dueno'), 'seguimiento', 'x'), { estado: 'listo' }));
  });
});

// ─── Solo Functions ───────────────────────────────────────────────────────────

describe('colecciones que solo escriben las Functions', () => {
  it('contadores: nadie lee ni escribe', async () => {
    await assertFails(getDoc(doc(db('dueno'), 'contadores', '2026-10-02')));
    await assertFails(setDoc(doc(db('dueno'), 'contadores', '2026-10-02'), { ultimoNumero: 0 }));
  });

  it('statsDiarias: leen gestores, escribe nadie', async () => {
    await assertSucceeds(getDoc(doc(db('encargado'), 'statsDiarias', '2026-10-02')));
    await assertFails(getDoc(doc(db('mozo'), 'statsDiarias', '2026-10-02')));
    await assertFails(setDoc(doc(db('dueno'), 'statsDiarias', '2026-10-02'), { ventas: 1e9 }));
  });

  it('clientes: leen gestores, escribe nadie', async () => {
    await assertSucceeds(getDoc(doc(db('dueno'), 'clientes', '5492611234567')));
    await assertFails(getDoc(doc(db('cocina'), 'clientes', '5492611234567')));
    await assertFails(setDoc(doc(db('dueno'), 'clientes', '1'), { nombre: 'X' }));
  });

  it('auditoria: solo el dueño la lee; nadie escribe', async () => {
    await assertSucceeds(getDoc(doc(db('dueno'), 'auditoria', 'a1')));
    await assertFails(getDoc(doc(db('encargado'), 'auditoria', 'a1')));
    await assertFails(setDoc(doc(db('dueno'), 'auditoria', 'a2'), { accion: 'x' }));
  });
});

describe('caja', () => {
  const mov = () => ({
    tipo: 'egreso',
    categoria: 'proveedor',
    monto: 5000,
    detalle: 'Pan',
    porUid: 'encargado',
    en: serverTimestamp(),
  });
  const movs = (u: NombreUsuario) => collection(db(u), 'turnosCaja', 't1', 'movimientos');

  it('turnos: leen gestores, escriben Functions', async () => {
    await assertSucceeds(getDoc(doc(db('encargado'), 'turnosCaja', 't1')));
    await assertFails(getDoc(doc(db('mozo'), 'turnosCaja', 't1')));
    await assertFails(updateDoc(doc(db('dueno'), 'turnosCaja', 't1'), { estado: 'cerrado' }));
  });

  it('movimientos: el gestor los crea a su nombre; no se editan ni borran', async () => {
    const ref = await assertSucceeds(addDoc(movs('encargado'), mov()));
    await assertFails(addDoc(movs('encargado'), { ...mov(), porUid: 'dueno' }));
    await assertFails(addDoc(movs('encargado'), { ...mov(), monto: 0 }));
    await assertFails(addDoc(movs('encargado'), { ...mov(), monto: 10.5 }));
    await assertFails(addDoc(movs('mozo'), { ...mov(), porUid: 'mozo' }));
    const d = db('encargado');
    await assertFails(updateDoc(doc(d, ref.path), { monto: 1 }));
    await assertFails(deleteDoc(doc(d, ref.path)));
  });

  it('movimientos: solo en la caja abierta (un cierre no se modifica)', async () => {
    await assertFails(
      addDoc(collection(db('encargado'), 'turnosCaja', 't2', 'movimientos'), mov()),
    );
  });
});
