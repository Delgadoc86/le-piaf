'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, LogOut } from 'lucide-react';
import type { Rol } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NOMBRE_LOCAL } from '@/lib/local';
import { menuPara, NOMBRE_ROL } from '@/features/panel/menu';

interface Props {
  rol: Rol;
  email: string;
  onCerrarSesion: () => void;
}

/**
 * Celular: fila de pestañas con scroll horizontal. Tablet (md a xl): columna angosta solo con
 * íconos, para dejarle el ancho al tablero de pedidos. Computadora (xl+): barra completa.
 */
export function BarraLateral({ rol, email, onCerrarSesion }: Props) {
  const pathname = usePathname();

  return (
    <aside className="border-b bg-muted/30 md:sticky md:top-0 md:flex md:h-dvh md:w-16 md:flex-col md:border-r md:border-b-0 xl:w-60">
      <div className="flex items-center justify-between gap-2 p-4 md:justify-center md:px-2 xl:justify-between xl:px-4">
        <div className="min-w-0 md:hidden xl:block">
          <p className="truncate font-semibold">{NOMBRE_LOCAL}</p>
          <Badge variant="secondary" className="mt-1">
            {NOMBRE_ROL[rol]}
          </Badge>
        </div>
        <span
          className="hidden size-9 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground md:inline-flex xl:hidden"
          title={`${NOMBRE_LOCAL} · ${NOMBRE_ROL[rol]}`}
        >
          {NOMBRE_LOCAL.charAt(0)}
        </span>
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
          const Icono = item.icono;
          return (
            <Link
              key={item.ruta}
              href={href}
              aria-current={activo ? 'page' : undefined}
              title={item.titulo}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted md:justify-center md:px-0 md:py-2.5 xl:justify-start xl:px-3 xl:py-2',
                activo &&
                  'bg-muted font-medium md:bg-primary md:text-primary-foreground xl:bg-muted xl:text-foreground',
              )}
            >
              <Icono className="size-4 shrink-0 md:size-5 xl:size-4" aria-hidden />
              <span className="whitespace-nowrap md:sr-only xl:not-sr-only">{item.titulo}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t p-4 md:flex md:flex-col md:items-center md:gap-3 md:px-2 xl:block xl:px-4">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          title="Ver la web"
          className="flex items-center gap-2 text-sm font-medium hover:underline xl:mb-3"
        >
          <ExternalLink className="size-4" aria-hidden />
          <span className="md:sr-only xl:not-sr-only">Ver la web</span>
        </a>
        <p className="hidden truncate text-xs text-muted-foreground xl:block">{email}</p>
        <button
          type="button"
          onClick={onCerrarSesion}
          title="Cerrar sesión"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground xl:mt-2"
        >
          <LogOut className="size-4" aria-hidden />
          <span className="md:sr-only xl:not-sr-only">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
