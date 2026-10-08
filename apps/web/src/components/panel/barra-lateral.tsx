'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, LogOut, UserCircle, Wallet } from 'lucide-react';
import type { Rol } from '@app/shared';
import { cn } from '@/lib/utils';
import { NOMBRE_LOCAL } from '@/lib/local';
import {
  ETIQUETA_SECCION,
  menuPara,
  NOMBRE_ROL,
  type ItemMenu,
  type SeccionMenu,
} from '@/features/panel/menu';
import { useCajaAbierta } from '@/features/panel/caja';

interface Props {
  rol: Rol;
  email: string;
  onCerrarSesion: () => void;
}

const ORDEN_SECCIONES: SeccionMenu[] = ['operaciones', 'finanzas', 'catalogo', 'sistema'];

/**
 * Celular: fila de pestañas con scroll horizontal. Tablet (md a xl): columna angosta solo con
 * íconos, para dejarle el ancho al tablero de pedidos. Computadora (xl+): barra completa categorizada.
 */
export function BarraLateral({ rol, email, onCerrarSesion }: Props) {
  const pathname = usePathname();
  const esGestor = rol === 'dueno' || rol === 'encargado';
  const { turno, cargando: cargandoCaja } = useCajaAbierta();

  const todosLosItems = menuPara(rol);

  const seccionesAgrupadas = ORDEN_SECCIONES.map((seccion) => ({
    seccion,
    items: todosLosItems.filter((i) => i.seccion === seccion),
  })).filter((s) => s.items.length > 0);

  function renderEnlace(item: ItemMenu) {
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
          'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors md:justify-center md:px-0 md:py-2.5 xl:justify-start xl:px-3 xl:py-2',
          activo
            ? 'bg-slate-800 font-semibold text-white shadow-xs'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
        )}
      >
        <Icono
          className={cn(
            'size-4 shrink-0 md:size-5 xl:size-4.5',
            activo ? 'text-orange-400' : 'text-slate-400',
          )}
          aria-hidden
        />
        <span className="whitespace-nowrap md:sr-only xl:not-sr-only">{item.titulo}</span>
      </Link>
    );
  }

  return (
    <aside className="shrink-0 border-b border-slate-800 bg-[#0f172a] text-slate-300 md:sticky md:top-0 md:flex md:h-dvh md:w-16 md:flex-col md:border-r md:border-b-0 xl:w-64">
      {/* Cabecera del Sidebar: Logo estilo mockup */}
      <div className="flex items-center justify-between gap-2 p-3.5 md:flex-col md:justify-center md:px-2 md:py-4 xl:items-stretch xl:p-4">
        <div className="min-w-0 md:hidden xl:block">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-base font-black text-white shadow-sm">
              S
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-white">Silverio</p>
              <p className="text-[10px] font-medium text-slate-400">{NOMBRE_ROL[rol]}</p>
            </div>
          </div>

          {/* Widget de estado de caja en vivo estilo Mockup */}
          {esGestor && (
            <div className="mt-3">
              {turno ? (
                <Link
                  href="/panel/caja"
                  title="Ir al turno de caja activo"
                  className="flex items-center justify-between gap-1.5 rounded-xl border border-emerald-800/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-900/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    Caja Abierta
                  </span>
                  <Wallet className="size-3.5 opacity-70" />
                </Link>
              ) : !cargandoCaja ? (
                <Link
                  href="/panel/caja"
                  title="Toca para abrir la caja"
                  className="flex items-center justify-between gap-1.5 rounded-xl border border-amber-800/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-900/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400" />
                    Caja Cerrada
                  </span>
                  <span className="text-[10px] font-normal underline">Abrir</span>
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {/* Logo compacto para tablet */}
        <span
          className="hidden size-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 font-bold text-white shadow-sm md:inline-flex xl:hidden"
          title={`${NOMBRE_LOCAL} · ${NOMBRE_ROL[rol]}`}
        >
          S
        </span>

        <button
          type="button"
          onClick={onCerrarSesion}
          aria-label="Cerrar sesión"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>

      {/* Navegación para desktop (categorizada con subtítulos en mayúsculas estilo mockup) */}
      <nav
        aria-label="Secciones del panel"
        className="hidden xl:flex xl:flex-1 xl:flex-col xl:gap-4 xl:overflow-y-auto xl:px-3 xl:py-2"
      >
        {seccionesAgrupadas.map(({ seccion, items }) => (
          <div key={seccion} className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {ETIQUETA_SECCION[seccion]}
            </p>
            <div className="space-y-0.5">{items.map(renderEnlace)}</div>
          </div>
        ))}
      </nav>

      {/* Navegación para móvil y tablet (plana y compacta) */}
      <nav
        aria-label="Secciones del panel"
        className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-y-auto xl:hidden"
      >
        {todosLosItems.map(renderEnlace)}
      </nav>

      {/* Pie del Sidebar: usuario, ver web y salir */}
      <div className="hidden border-t border-slate-800 p-3 md:flex md:flex-col md:items-center md:gap-2.5 md:px-2 xl:block xl:p-4">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          title="Abrir tienda web pública"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white xl:mb-2"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="md:sr-only xl:not-sr-only">Ver la web pública</span>
        </a>
        <div className="hidden min-w-0 xl:block">
          <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-400" title={email}>
            <UserCircle className="size-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrarSesion}
          title="Cerrar sesión"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-rose-950/50 hover:text-rose-300 xl:mt-1.5"
        >
          <LogOut className="size-3.5" aria-hidden />
          <span className="md:sr-only xl:not-sr-only">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
