'use client';

/** Guardado de local/datos por secciones (solo el dueño, según firestore.rules). */
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { DOC_LOCAL, type LocalEditable } from '@app/shared';
import { firebase } from '@/lib/firebase/client';

export function guardarLocal(cambios: Partial<LocalEditable>) {
  return updateDoc(doc(firebase().db, DOC_LOCAL), { ...cambios, actualizadoEn: serverTimestamp() });
}
