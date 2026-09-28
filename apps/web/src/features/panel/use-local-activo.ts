'use client';

import { useParams } from 'next/navigation';
import { useSesion, type LocalDeSesion } from '@/features/auth/sesion';

/** Local de la URL (/panel/[localId]) y el rol del usuario en él. null si no tiene acceso. */
export function useLocalActivo(): LocalDeSesion | null {
  const { localId } = useParams<{ localId: string }>();
  const sesion = useSesion();
  if (sesion.estado !== 'lista') return null;
  return sesion.locales.find((l) => l.id === localId) ?? null;
}
