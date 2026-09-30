'use client';

/** Guardado de local/datos por secciones (solo el dueño, según firestore.rules). */
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { DOC_LOCAL, type LocalEditable } from '@app/shared';
import { firebase } from '@/lib/firebase/client';

export function guardarLocal(cambios: Partial<LocalEditable>) {
  return updateDoc(doc(firebase().db, DOC_LOCAL), { ...cambios, actualizadoEn: serverTimestamp() });
}

/** Formas de entrega que ofrece la web (retiro, delivery, comer en el local). */
export function guardarTiposEntrega(tipos: LocalEditable['pedidos']['tipos']) {
  return updateDoc(doc(firebase().db, DOC_LOCAL), {
    'pedidos.tipos': tipos,
    actualizadoEn: serverTimestamp(),
  });
}

/** Confirmación por WhatsApp de clientes nuevos (pedidos falsos). */
export function guardarConfirmacion(confirmacion: {
  clientesNuevos: boolean;
  aceptarSinConfirmar: boolean;
}) {
  return updateDoc(doc(firebase().db, DOC_LOCAL), {
    'pedidos.confirmacion': confirmacion,
    actualizadoEn: serverTimestamp(),
  });
}
