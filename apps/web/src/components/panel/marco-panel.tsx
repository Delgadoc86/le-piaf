'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSesion } from '@/features/auth/sesion';
import { BarraLateral } from '@/components/panel/barra-lateral';
import { inicializarAudioAutomatico } from '@/features/panel/sonido';

function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-muted-foreground" role="status">
      Cargando…
    </div>
  );
}

/**
 * Guardia y marco del panel: sin sesión → /login; con cuenta pero sin rol → aviso;
 * con rol → barra lateral + contenido. La seguridad real está en las reglas; esto es UX.
 */
export function MarcoPanel({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const router = useRouter();

  useEffect(() => {
    inicializarAudioAutomatico();
  }, []);

  useEffect(() => {
    if (sesion.estado === 'anonimo') router.replace('/login');
  }, [sesion.estado, router]);

  if (sesion.estado !== 'lista') return <Cargando />;

  if (!sesion.rol) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">Todavía no sos parte del equipo</h1>
        <p className="max-w-sm text-muted-foreground">
          Entraste como {sesion.usuario.email}. Pedile al dueño que te invite desde Equipo y volvé a
          entrar.
        </p>
        <Button variant="outline" onClick={() => void sesion.cerrarSesion()}>
          Cerrar sesión
        </Button>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f1f5f9] text-foreground md:flex-row dark:bg-[#0b1120]">
      <BarraLateral
        rol={sesion.rol}
        email={sesion.usuario.email ?? ''}
        onCerrarSesion={() => void sesion.cerrarSesion()}
      />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
