import { randomBytes } from 'node:crypto';
import {
  calcularPedido,
  claveJornada,
  configConfirmacion,
  crearPedidoInputSchema,
  DOC_LOCAL,
  ErrorPrecio,
  estaAbierto,
  estadoPagoDe,
  MINUTOS_CONFIRMACION,
  promoVigente,
  requiereConfirmacion,
  type EstadoPedido,
  type Cliente,
  type ItemPedido,
  type Local,
  type PagoPedido,
  type Pedido,
  type Producto,
  type Promo,
  type Seguimiento,
  type TipoPedido,
} from '@app/shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../util/admin.js';
import { requerirRol, requerirSesion, validarInput } from '../util/validar.js';

/** Un mismo teléfono no puede mandar dos pedidos web seguidos en menos de esto. */
const ESPERA_ENTRE_PEDIDOS_MS = 60_000;

const TIPO_HABILITADO: Record<TipoPedido, keyof Local['pedidos']['tipos']> = {
  take_away: 'takeAway',
  delivery: 'delivery',
  salon: 'salon',
};

const rechazar = (mensaje: string): never => {
  throw new HttpsError('failed-precondition', mensaje);
};

/**
 * Crea un pedido (ROADMAP §8). Lo llaman la web (origen "web") y el panel (mostrador/teléfono).
 * Los precios SIEMPRE se recalculan acá con calcularPedido; del cliente solo se toma qué eligió.
 * El número (#1, #2…) es correlativo por jornada y se asigna en una transacción.
 */
export const crearPedido = onCall(async (req) => {
  const input = validarInput(crearPedidoInputSchema, req.data);
  const esStaff = input.origen !== 'web';
  let uid: string | undefined;
  if (esStaff) {
    const sesion = requerirSesion(req);
    requerirRol(sesion.claims, ['dueno', 'encargado', 'mozo']);
    uid = sesion.uid;
  }

  const localSnap = await db.doc(DOC_LOCAL).get();
  if (!localSnap.exists) rechazar('El local no está configurado');
  const local = localSnap.data() as Local;
  const ahora = new Date();

  // ─── Reglas del local (solo para pedidos web; el staff carga lo que le pidan) ───
  if (!esStaff) {
    if (!local.activo || !local.pedidos.habilitados) {
      rechazar('Por ahora no estamos tomando pedidos por la web');
    }
    const pausa = local.pedidos.pausadoHasta?.toMillis();
    if (pausa && pausa > ahora.getTime()) {
      rechazar('Pausamos los pedidos un ratito por mucha demanda. Probá en unos minutos');
    }
    if (!estaAbierto(local, ahora)) {
      rechazar(local.pedidos.mensajeCerrado || 'Ahora estamos cerrados');
    }
    if (!local.pedidos.tipos[TIPO_HABILITADO[input.tipo]]) {
      rechazar('Esa forma de entrega no está disponible');
    }
    const medioOk =
      input.pago.medio === 'efectivo' ? local.pagos.efectivo : local.pagos.transferencia.habilitado;
    if (!medioOk) rechazar('Ese medio de pago no está disponible');
  }

  // ─── Catálogo: solo lo que está en el pedido ───
  const idsProductos = [
    ...new Set(input.items.flatMap((i) => (i.tipo === 'producto' ? [i.productoId] : []))),
  ];
  const idsPromos = [
    ...new Set(input.items.flatMap((i) => (i.tipo === 'promo' ? [i.promoId] : []))),
  ];
  const [productos, promos] = await Promise.all([
    idsProductos.length
      ? db.getAll(...idsProductos.map((id) => db.doc(`productos/${id}`)))
      : Promise.resolve([]),
    idsPromos.length
      ? db.getAll(...idsPromos.map((id) => db.doc(`promos/${id}`)))
      : Promise.resolve([]),
  ]);
  const catalogo = {
    productos: new Map(
      productos.filter((d) => d.exists).map((d) => [d.id, { ...(d.data() as Producto), id: d.id }]),
    ),
    promos: new Map(
      promos.filter((d) => d.exists).map((d) => [d.id, { ...(d.data() as Promo), id: d.id }]),
    ),
  };
  if (!esStaff) {
    for (const promo of catalogo.promos.values()) {
      if (!promoVigente(promo, ahora, local.zonaHoraria)) {
        rechazar(`La promo "${promo.titulo}" no está vigente en este horario`);
      }
    }
  }

  let totales;
  try {
    totales = calcularPedido(input.items, catalogo, {}, { validarDisponibilidad: !esStaff });
  } catch (e) {
    if (e instanceof ErrorPrecio)
      throw new HttpsError('failed-precondition', e.message, { codigo: e.codigo });
    throw e;
  }
  if (!esStaff && totales.subtotal < local.pedidos.pedidoMinimo) {
    rechazar('No llegás al pedido mínimo');
  }

  // ─── Armado del pedido ───
  const en = Timestamp.fromDate(ahora);
  const estado: EstadoPedido = esStaff ? 'en_preparacion' : 'pendiente';
  const items: ItemPedido[] = totales.items.map((l, i) => ({
    id: String(i + 1),
    tipo: l.tipo,
    productoId: l.refId,
    nombre: l.nombre,
    ...(l.varianteNombre ? { varianteNombre: l.varianteNombre } : {}),
    extras: l.extras,
    precioUnitario: l.precioUnitario,
    cantidad: l.cantidad,
    ...(l.nota ? { nota: l.nota } : {}),
    subtotal: l.subtotal,
    estacion: l.estacion,
    ronda: 1,
    estadoCocina: 'pendiente',
  }));
  const pagos: PagoPedido[] =
    esStaff && input.pagado
      ? [
          {
            medio: input.pago.medio,
            monto: totales.total,
            estado: 'aprobado',
            ...(uid ? { porUid: uid } : {}),
          },
        ]
      : [];
  const nombre = input.cliente?.nombre.trim() ?? '';
  const telefono = input.cliente?.telefono;
  const cliente = nombre || telefono ? { nombre, ...(telefono ? { telefono } : {}) } : undefined;
  const jornada = claveJornada(ahora, local.zonaHoraria);
  const token = randomBytes(16).toString('base64url');
  const pedidoRef = db.collection('pedidos').doc();
  const contadorRef = db.doc(`contadores/${jornada}`);
  const clienteRef = telefono ? db.doc(`clientes/${telefono}`) : null;

  const bloqueoRef = !esStaff && telefono ? db.doc(`bloqueados/${telefono}`) : null;
  const confirmacion = configConfirmacion(local.pedidos);

  const { numero, porConfirmar, confirmarAntesDe } = await db.runTransaction(async (tx) => {
    const [contador, clienteSnap, bloqueo] = await Promise.all([
      tx.get(contadorRef),
      clienteRef ? tx.get(clienteRef) : Promise.resolve(null),
      bloqueoRef ? tx.get(bloqueoRef) : Promise.resolve(null),
    ]);

    // Número bloqueado por el local: mensaje genérico, sin decirle que está bloqueado.
    if (bloqueo?.exists) {
      throw new HttpsError(
        'permission-denied',
        'No pudimos tomar tu pedido por la web. Escribinos por WhatsApp.',
      );
    }

    // Límite de frecuencia por teléfono (App Check se suma con el dominio definitivo).
    const ultimo = (clienteSnap?.get('ultimoPedido') as Timestamp | undefined)?.toMillis();
    if (!esStaff && ultimo && ahora.getTime() - ultimo < ESPERA_ENTRE_PEDIDOS_MS) {
      throw new HttpsError(
        'resource-exhausted',
        'Ya recibimos un pedido de este teléfono hace un momento. Esperá un minuto para mandar otro',
      );
    }

    const numero = ((contador.get('ultimoNumero') as number | undefined) ?? 0) + 1;
    tx.set(contadorRef, { ultimoNumero: numero }, { merge: true });

    // Cliente nuevo (nunca recibió un pedido): tiene que confirmar por WhatsApp o se cancela solo.
    const porConfirmar =
      !esStaff && requiereConfirmacion(clienteSnap?.data() as Cliente | undefined, confirmacion);
    const confirmarAntesDe = porConfirmar
      ? Timestamp.fromMillis(ahora.getTime() + MINUTOS_CONFIRMACION * 60_000)
      : null;
    const confirmacionPedido = confirmarAntesDe ? { porConfirmar: true, confirmarAntesDe } : {};

    const pedido: Omit<Pedido, 'creadoEn' | 'actualizadoEn'> & Record<string, unknown> = {
      numero,
      jornada,
      tipo: input.tipo,
      origen: input.origen,
      estado,
      ...(cliente ? { cliente } : {}),
      ...(input.entrega
        ? {
            entrega: {
              direccion: input.entrega.direccion,
              ...(input.entrega.referencia ? { referencia: input.entrega.referencia } : {}),
              ...(input.entrega.zonaId ? { zonaId: input.entrega.zonaId } : {}),
              costo: totales.costoEnvio,
            },
          }
        : {}),
      pagoElegido: {
        medio: input.pago.medio,
        ...(input.pago.medio === 'efectivo' && input.pago.pagaCon
          ? { pagaCon: input.pago.pagaCon }
          : {}),
      },
      ...(input.nota ? { nota: input.nota } : {}),
      ...(esStaff && uid ? { mozoUid: uid } : {}),
      items,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      costoEnvio: totales.costoEnvio,
      total: totales.total,
      pagos,
      estadoPago: estadoPagoDe(pagos, totales.total),
      tiempoEstimadoMin: local.pedidos.tiempoEstimadoMin,
      ...confirmacionPedido,
      seguimientoToken: token,
      contabilizado: false,
      historial: [{ estado, en, ...(uid && esStaff ? { porUid: uid } : {}) }],
    };
    tx.create(pedidoRef, {
      ...pedido,
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    const seguimiento: Omit<Seguimiento, 'creadoEn' | 'actualizadoEn'> = {
      numero,
      estado,
      tipo: input.tipo,
      tiempoEstimadoMin: local.pedidos.tiempoEstimadoMin,
      items: items.map((i) => ({
        nombre: i.varianteNombre ? `${i.nombre} (${i.varianteNombre})` : i.nombre,
        cantidad: i.cantidad,
      })),
      total: totales.total,
      costoEnvio: totales.costoEnvio,
      medioPago: input.pago.medio,
      estadoPago: pedido.estadoPago,
      ...confirmacionPedido,
      localNombre: local.nombre,
    };
    tx.create(db.doc(`seguimiento/${token}`), {
      ...seguimiento,
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    if (clienteRef && telefono) {
      tx.set(
        clienteRef,
        {
          nombre: nombre || (clienteSnap?.get('nombre') as string | undefined) || '',
          telefono,
          cantidadPedidos: FieldValue.increment(1),
          totalGastado: FieldValue.increment(totales.total),
          ultimoPedido: en,
          ...(input.entrega ? { direcciones: FieldValue.arrayUnion(input.entrega.direccion) } : {}),
        },
        { merge: true },
      );
    }
    return { numero, porConfirmar, confirmarAntesDe };
  });

  return {
    id: pedidoRef.id,
    numero,
    token,
    total: totales.total,
    porConfirmar,
    confirmarAntesDe: confirmarAntesDe?.toMillis() ?? null,
  };
});
