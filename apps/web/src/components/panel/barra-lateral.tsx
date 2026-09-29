'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { Rol } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NOMBRE_LOCAL } from '@/lib/local';
import { FASE_ACTUAL, menuPara, NOMBRE_ROL } from '@/features/panel/menu';

interface Props {
  rol: Rol;
  email: string;
  onCerrarSesion: () => void;
}

/** En escritorio es una barra lateral; en celular, una fila de pestañas con scroll horizontal. */
export function BarraLateral({ rol, email, onCerrarSesion }: Props) {
  const pathname = usePathname();

  return (
    <aside className="border-b bg-muted/30 md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{NOMBRE_LOCAL}</p>
          <Badge variant="secondary" className="mt-1">
            {NOMBRE_ROL[rol]}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onCerrarSesion}
          aria-label="Cerrar sesión"
          className="rounded-md p-2 hover:bg-muted md:hidden"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>

      <nav
        aria-label="Secciones del panel"
        className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-y-auto"
      >
        {menuPara(rol).map((item) => {
          const href = item.ruta ? `/panel/${item.ruta}` : '/panel';
          const activo = pathname === href;
          const disponible = item.fase <= FASE_ACTUAL;
          const Icono = item.icono;
          const contenido = (
            <>
              <Icono className="size-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{item.titulo}</span>
              {!disponible && <span className="ml-auto hidden text-xs text-muted-foreground md:inline">Pronto</span>}
            </>
          );
          const clases = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm';
          return disponible ? (
            <Link
              key={item.ruta}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className={cn(clases, 'hover:bg-muted', activo && 'bg-muted font-medium')}
            >
              {contenido}
            </Link>
          ) : (
            <span key={item.ruta} aria-disabled className={cn(clases, 'cursor-not-allowed opacity-50')}>
              {contenido}
            </span>
          );
        })}
      </nav>

      <div className="hidden border-t p-4 md:block">
        <p className="truncate text-xs text-muted-foreground">{email}</p>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
