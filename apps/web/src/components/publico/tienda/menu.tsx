'use client';

/**
 * Carta estilo Bistró:
 * Buscador integrado, selector de categorías moderno con acentos de leña,
 * y tarjetas de platillos con diseño visual-first (foto protagonista + botón cápsula).
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { formatARS, type EtiquetaProducto } from '@app/shared';
import type { CategoriaPublica, ProductoPublico } from '@/features/sitio/datos';
import { useCarrito, useTiendaUI } from '@/features/carrito/store';
import { useTienda } from '@/features/carrito/tienda';
import { cn } from '@/lib/utils';
import { IconoCategoria, Miniatura } from './ilustracion';

export interface GrupoCarta {
  categoria: CategoriaPublica;
  productos: ProductoPublico[];
}

const ETIQUETAS: Record<EtiquetaProducto, string> = {
  nuevo: 'Nuevo',
  picante: 'Picante',
  vegetariano: 'Veggie',
  sin_tacc: 'Sin TACC',
  recomendado: 'Recomendado',
};

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function precioVisible(p: ProductoPublico): string {
  const variantes = p.variantes ?? [];
  if (variantes.length > 0) {
    const precios = variantes.map((v) => v.precio);
    const min = Math.min(...precios);
    return min === Math.max(...precios) ? formatARS(min) : `desde ${formatARS(min)}`;
  }
  return p.precio > 0 ? formatARS(p.precio) : 'Consultar';
}

/** ¿Se puede agregar con un toque? (sin variantes ni extras obligatorios) */
const agregadoDirecto = (p: ProductoPublico) =>
  (p.variantes ?? []).length === 0 &&
  (p.gruposExtras ?? []).every((g) => g.min === 0) &&
  p.precio > 0;

export function Menu({ grupos, nota }: { grupos: GrupoCarta[]; nota?: string | undefined }) {
  const [busqueda, setBusqueda] = useState('');
  const [activa, setActiva] = useState(grupos[0]?.categoria.id ?? '');
  const fila = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        productos: g.productos.filter((p) =>
          normalizar(
            [
              p.nombre,
              p.descripcion,
              g.categoria.nombre,
              ...(p.variantes ?? []).map((v) => v.nombre),
            ].join(' '),
          ).includes(q),
        ),
      }))
      .filter((g) => g.productos.length > 0);
  }, [busqueda, grupos]);

  // Categoría activa según scroll
  useEffect(() => {
    let pendiente = false;
    const calcular = () => {
      pendiente = false;
      const limite = (barra.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let actual = visibles[0]?.categoria.id;
      for (const g of visibles) {
        const s = document.getElementById(`cat-${g.categoria.id}`);
        if (s && s.getBoundingClientRect().top <= limite) actual = g.categoria.id;
      }
      if (actual) setActiva(actual);
    };
    const alScrollear = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(calcular);
      }
    };
    window.addEventListener('scroll', alScrollear, { passive: true });
    calcular();
    return () => window.removeEventListener('scroll', alScrollear);
  }, [visibles]);

  useEffect(() => {
    const f = fila.current;
    const chip = f?.querySelector<HTMLElement>(`[data-cat="${CSS.escape(activa)}"]`);
    if (f && chip)
      f.scrollTo({
        left: chip.offsetLeft - f.clientWidth / 2 + chip.clientWidth / 2,
        behavior: 'smooth',
      });
  }, [activa]);

  function irA(id: string) {
    setActiva(id);
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <div>
      {/* Barra de búsqueda y categorías sticky con diseño de vidrio ahumado */}
      <div
        ref={barra}
        className="sticky top-[4rem] z-30 -mx-4 border-b border-white/10 bg-[#0C0D12]/92 px-4 pt-3.5 pb-3.5 shadow-md backdrop-blur-2xl md:top-[4rem] md:-mx-6 md:px-6"
      >
        <label className="relative block">
          <span className="sr-only">Buscar en la carta</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-tinta-2"
            aria-hidden
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar pizza, lomo, calzone, papas…"
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pr-12 pl-11 text-sm text-white placeholder:text-tinta-2/70 focus:border-amber-500/60 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-tinta-2 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>

        {/* Selector de categorías rediseñado en tabs elegantes */}
        <nav aria-label="Categorías de la carta">
          <div ref={fila} className="carrusel mt-3 flex items-center gap-2 overflow-x-auto py-0.5">
            {visibles.map((g) => {
              const on = activa === g.categoria.id;
              return (
                <button
                  key={g.categoria.id}
                  type="button"
                  data-cat={g.categoria.id}
                  onClick={() => irA(g.categoria.id)}
                  aria-current={on ? 'true' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold tracking-wide transition-all duration-300',
                    on
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_4px_16px_rgba(245,158,11,0.35)]'
                      : 'border border-white/5 bg-white/[0.04] text-tinta-2 hover:border-white/10 hover:bg-white/[0.08] hover:text-white',
                  )}
                >
                  <IconoCategoria
                    icono={g.categoria.icono}
                    className={cn('size-4 transition-transform', on && 'scale-110 drop-shadow-sm')}
                  />
                  <span>{g.categoria.nombre}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {visibles.length === 0 && (
        <p className="py-16 text-center text-tinta-2">
          No encontramos &ldquo;{busqueda}&rdquo;. Probá con otra palabra.
        </p>
      )}

      {/* Secciones de platos */}
      {visibles.map((g) => (
        <section
          key={g.categoria.id}
          id={`cat-${g.categoria.id}`}
          aria-labelledby={`t-${g.categoria.id}`}
          className="scroll-mt-[13rem] pt-10 md:scroll-mt-[14rem]"
        >
          <div className="mb-4 flex items-baseline justify-between border-b border-white/5 pb-2">
            <h3 id={`t-${g.categoria.id}`} className="font-titulos text-2xl font-bold tracking-tight text-white md:text-3xl">
              {g.categoria.nombre}
            </h3>
            <span className="text-xs font-medium text-tinta-2 tabular-nums">
              {g.productos.length} {g.productos.length === 1 ? 'opción' : 'opciones'}
            </span>
          </div>

          <ul className="grid gap-3.5 md:grid-cols-2 md:gap-4">
            {g.productos.map((p) => (
              <li key={p.id}>
                <FilaProducto producto={p} icono={g.categoria.icono} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {nota && <p className="mt-10 text-sm text-tinta-2 text-center md:text-left">{nota}</p>}
    </div>
  );
}

/**
 * Fila de Producto rediseñada:
 * Miniatura destacada a la izquierda (visual-first), nombre y descripción
 * con tipografía gourmet y botón cápsula de acción directa.
 */
function FilaProducto({
  producto: p,
  icono,
}: {
  producto: ProductoPublico;
  icono?: string | undefined;
}) {
  const abrir = useTiendaUI((e) => e.abrirProducto);
  const avisar = useTiendaUI((e) => e.avisarAgregado);
  const agregar = useCarrito((e) => e.agregar);
  const [listo, setListo] = useState(false);
  const agotado = !p.disponible;
  const directo = agregadoDirecto(p);
  const conCarrito = useTienda().pedidos.habilitados;

  function mas(e: MouseEvent) {
    e.stopPropagation();
    if (!directo) return abrir(p.id);
    agregar({ tipo: 'producto', productoId: p.id, extras: [], cantidad: 1 });
    avisar();
    setListo(true);
    setTimeout(() => setListo(false), 1100);
  }

  return (
    <article
      className={cn(
        'group relative flex h-full items-center gap-3.5 sm:gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 sm:p-3.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:from-white/[0.07] hover:to-white/[0.03] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
        agotado && 'opacity-55',
      )}
    >
      {/* Toda la fila abre la hoja de producto */}
      <button
        type="button"
        onClick={() => abrir(p.id)}
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`Ver ${p.nombre}`}
      />

      {/* Miniatura protagonista a la izquierda */}
      <div className="relative shrink-0">
        <Miniatura
          fotoUrl={p.fotoUrl}
          alt={p.nombre}
          icono={icono}
          sizes="(min-width: 640px) 120px, 104px"
          className="pointer-events-none size-24 sm:size-28 rounded-2xl"
          iconoClassName="size-16 sm:size-18"
        />
      </div>

      {/* Información del plato */}
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col py-0.5">
        <h4 className="font-semibold text-white text-pretty group-hover:text-amber-400 transition-colors sm:text-lg">
          {p.nombre}
        </h4>
        {p.descripcion && p.descripcion.replace(/\.$/, '') !== p.nombre && (
          <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-tinta-2 leading-relaxed">
            {p.descripcion}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-marca tabular-nums sm:text-lg">
              {precioVisible(p)}
            </span>
            {agotado && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase text-tinta-2">
                Agotado
              </span>
            )}
            {p.etiquetas?.map((e) => (
              <span
                key={e}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                  e === 'recomendado' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/8 text-tinta-2',
                )}
              >
                {ETIQUETAS[e]}
              </span>
            ))}
          </div>

          {/* Botón de acción cápsula */}
          {!agotado && conCarrito && (
            <button
              type="button"
              onClick={mas}
              aria-label={directo ? `Agregar ${p.nombre}` : `Elegir opciones de ${p.nombre}`}
              className={cn(
                'relative z-10 inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-black shadow-sm transition-all duration-300 hover:scale-105 active:scale-95',
                listo
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500',
              )}
            >
              {listo ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  <span>Listo</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">Agregar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
