'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cargando } from '@/components/panel/requiere-sesion';
import { useSesion } from '@/features/auth/sesion';
import { NOMBRE_ROL } from '@/features/panel/menu';

/** Selector de local. Si el usuario tiene uno solo, entra directo. */
export default function SelectorDeLocal() {
  const sesion = useSesion();
  const router = useRouter();
  const locales = sesion.estado === 'lista' ? sesion.locales : [];
  const unico = locales.length === 1 && sesion.estado === 'lista' && !sesion.esSA ? locales[0] : undefined;

  useEffect(() => {
    if (unico) router.replace(`/panel/${unico.id}`);
  }, [unico, router]);

  if (sesion.estado !== 'lista' || unico) return <Cargando />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Elegí un local</CardTitle>
          <CardDescription>{sesion.usuario.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {locales.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no sos parte de ningún local. Pedile al dueño que te invite desde Equipo.
            </p>
          )}
          {locales.map((l) => (
            <Link
              key={l.id}
              href={`/panel/${l.id}`}
              className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Store className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 font-medium">{l.nombre}</span>
              <Badge variant="secondary">{l.rol ? NOMBRE_ROL[l.rol] : 'Soporte'}</Badge>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </CardContent>
      </Card>
      <Button variant="ghost" onClick={() => void sesion.cerrarSesion()}>
        Cerrar sesión
      </Button>
    </main>
  );
}
