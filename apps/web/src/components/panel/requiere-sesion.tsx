'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSesion } from '@/features/auth/sesion';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground" role="status">
      {texto}
    </div>
  );
}

/** Redirige a /login si no hay sesión. La seguridad real está en las reglas; esto es UX. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (sesion.estado === 'anonimo') router.replace('/login');
  }, [sesion.estado, router]);

  if (sesion.estado !== 'lista') return <Cargando />;
  return <>{children}</>;
}
