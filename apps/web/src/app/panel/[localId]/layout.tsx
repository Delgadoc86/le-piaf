'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useSesion } from '@/features/auth/sesion';
import { useLocalActivo } from '@/features/panel/use-local-activo';
import { BarraLateral } from '@/components/panel/barra-lateral';
import { Button } from '@/components/ui/button';

export default function LocalLayout({ children }: { children: ReactNode }) {
  const local = useLocalActivo();
  const sesion = useSesion();

  if (!local) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">No tenés acceso a este local</h1>
        <p className="text-muted-foreground">Si creés que es un error, pedile al dueño que te invite.</p>
        <Button asChild variant="outline">
          <Link href="/panel">Volver a mis locales</Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <BarraLateral
        local={local}
        email={sesion.estado === 'lista' ? (sesion.usuario.email ?? '') : ''}
        variosLocales={sesion.estado === 'lista' && sesion.locales.length > 1}
        onCerrarSesion={() => void sesion.cerrarSesion()}
      />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
