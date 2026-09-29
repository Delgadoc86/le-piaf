import {
  abrirCajaInputSchema,
  cerrarCajaInputSchema,
  diferenciaCaja,
  esperadoCaja,
  porMedioVacio,
  type MovimientoCaja,
  type TurnoCaja,
} from '@app/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../util/admin.js';
import { requerirRol, requerirSesion, validarInput } from '../util/validar.js';
import { REF_CAJA } from './contabilizarPedido.js';

async function nombreDe(uid: string, email?: string): Promise<string> {
  const m = await db.doc(`miembros/${uid}`).get();
  return (m.get('nombre') as string | undefined) || email || 'Sin nombre';
}

/** Abre la caja con el efectivo inicial. Solo una abierta a la vez (candado en contadores/caja). */
export const abrirCaja = onCall(async (req) => {
  const { uid, email, claims } = requerirSesion(req);
  requerirRol(claims, ['dueno', 'encargado']);
  const input = validarInput(abrirCajaInputSchema, req.data);
  const nombre = await nombreDe(uid, email);

  const id = await db.runTransaction(async (tx) => {
    const caja = await tx.get(REF_CAJA());
    if (caja.get('turnoAbiertoId')) {
      throw new HttpsError('already-exists', 'Ya hay una caja abierta');
    }
    const ref = db.collection('turnosCaja').doc();
    tx.create(ref, {
      estado: 'abierto',
      abiertoPor: uid,
      abiertoPorNombre: nombre,
      abiertoEn: FieldValue.serverTimestamp(),
      montoInicial: input.montoInicial,
      totales: porMedioVacio(),
      cantidadPedidos: 0,
    });
    tx.set(REF_CAJA(), { turnoAbiertoId: ref.id });
    return ref.id;
  });
  return { id };
});

/**
 * Cierra la caja: calcula lo esperado (inicial + cobros + ingresos − egresos), lo compara con lo
 * contado y deja la foto del cierre en el turno y en auditoria.
 */
export const cerrarCaja = onCall(async (req) => {
  const { uid, email, claims } = requerirSesion(req);
  requerirRol(claims, ['dueno', 'encargado']);
  const input = validarInput(cerrarCajaInputSchema, req.data);
  const nombre = await nombreDe(uid, email);

  return db.runTransaction(async (tx) => {
    const turnoId = (await tx.get(REF_CAJA())).get('turnoAbiertoId') as string | null | undefined;
    if (!turnoId) throw new HttpsError('failed-precondition', 'No hay ninguna caja abierta');
    const ref = db.doc(`turnosCaja/${turnoId}`);
    const [turnoSnap, movsSnap] = await Promise.all([
      tx.get(ref),
      tx.get(ref.collection('movimientos')),
    ]);
    const turno = turnoSnap.data() as TurnoCaja;
    const movimientos = movsSnap.docs.map((d) => d.data() as MovimientoCaja);

    const esperado = esperadoCaja(turno, movimientos);
    const diferencia = diferenciaCaja(esperado, input.contado);
    const movimientosNeto = movimientos.reduce(
      (s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto),
      0,
    );

    tx.update(ref, {
      estado: 'cerrado',
      cerradoPor: uid,
      cerradoPorNombre: nombre,
      cerradoEn: FieldValue.serverTimestamp(),
      esperado,
      contado: input.contado,
      diferencia,
      movimientosNeto,
      ...(input.notas ? { notas: input.notas } : {}),
    });
    tx.set(REF_CAJA(), { turnoAbiertoId: null });
    tx.create(db.collection('auditoria').doc(), {
      accion: 'cierre_caja',
      detalle: { turnoId, esperado, contado: input.contado, diferencia, notas: input.notas ?? '' },
      porUid: uid,
      en: FieldValue.serverTimestamp(),
    });
    return { turnoId, esperado, contado: input.contado, diferencia };
  });
});
