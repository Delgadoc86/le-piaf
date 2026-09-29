'use client';

/**
 * Carta estilo app: buscador, chips de categoría fijos que siguen el scroll, y filas de producto
 * con miniatura y botón "+". Todo se renderiza en el servidor (SEO); el cliente agrega interacción.
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

  // Categoría activa = la última cuyo título ya pasó por debajo de la barra fija (scroll pasivo + rAF).
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
      <div
        ref={barra}
        className="sticky top-[4.25rem] z-30 -mx-4 border-b border-borde bg-fondo/92 px-4 pt-3 pb-3 backdrop-blur-xl md:top-[4.75rem] md:-mx-6 md:px-6"
      >
        <label className="relative block">
          <span className="sr-only">Buscar en la carta</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-tinta-2"
            aria-hidden
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar lomo, pizza, papas…"
            className="h-12 w-full rounded-full border border-borde bg-superficie pr-12 pl-12 text-base placeholder:text-tinta-2/70 focus:border-marca/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-tinta-2 hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </label>
        <nav aria-label="Categorías">
          <div ref={fila} className="carrusel mt-3 flex gap-2 overflow-x-auto">
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
                    'inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm font-medium transition-[background-color,color,border-color] duration-300',
                    on
                      ? 'border-marca bg-marca text-black'
                      : 'border-borde bg-superficie text-tinta-2 hover:text-tinta',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-full transition-colors',
                      on ? 'bg-black/15' : 'bg-marca/12 text-marca',
                    )}
                  >
                    <IconoCategoria icono={g.categoria.icono} className="size-4" />
                  </span>
                  {g.categoria.nombre}
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

      {visibles.map((g) => (
        <section
          key={g.categoria.id}
          id={`cat-${g.categoria.id}`}
          aria-labelledby={`t-${g.categoria.id}`}
          className="scroll-mt-[13rem] pt-8 md:scroll-mt-[14rem]"
        >
          <h3 id={`t-${g.categoria.id}`} className="mb-3 font-titulos text-2xl md:text-3xl">
            {g.categoria.nombre}
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {g.productos.map((p) => (
              <li key={p.id}>
                <FilaProducto producto={p} icono={g.categoria.icono} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {nota && <p className="mt-10 text-sm text-tinta-2">{nota}</p>}
    </div>
  );
}

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
        'elevar group relative flex h-full gap-4 rounded-3xl border border-borde bg-superficie p-3 pl-4',
        agotado && 'opacity-55',
      )}
    >
      {/* Toda la fila abre la hoja de producto; el "+" agrega directo. */}
      <button
        type="button"
        onClick={() => abrir(p.id)}
        className="absolute inset-0 z-0 rounded-3xl"
        aria-label={`Ver ${p.nombre}`}
      />
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col py-1">
        <h4 className="font-semibold text-pretty">{p.nombre}</h4>
        {p.descripcion && p.descripcion.replace(/\.$/, '') !== p.nombre && (
          <p className="mt-1 line-clamp-2 text-sm text-tinta-2">{p.descripcion}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3">
          <span className="font-bold text-marca tabular-nums">{precioVisible(p)}</span>
          {agotado && (
            <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              Agotado
            </span>
          )}
          {p.etiquetas?.map((e) => (
            <span
              key={e}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                e === 'recomendado' ? 'bg-marca/15 text-marca' : 'bg-white/8 text-tinta-2',
              )}
            >
              {ETIQUETAS[e]}
            </span>
          ))}
          {(p.variantes?.length ?? 0) > 0 && (
            <span className="text-[11px] text-tinta-2">{p.variantes!.length} opciones</span>
          )}
        </div>
      </div>
      <div className="relative shrink-0">
        <Miniatura
          fotoUrl={p.fotoUrl}
          alt={p.nombre}
          icono={icono}
          sizes="112px"
          className="pointer-events-none size-24 rounded-2xl md:size-28"
        />
        {!agotado && conCarrito && (
          <button
            type="button"
            onClick={mas}
            aria-label={directo ? `Agregar ${p.nombre}` : `Elegir opciones de ${p.nombre}`}
            className={cn(
              'absolute -right-1 -bottom-1 z-10 inline-flex size-10 items-center justify-center rounded-full border-4 border-superficie text-black shadow-lg transition-[background-color,transform] duration-300 active:scale-90',
              listo ? 'bg-emerald-400' : 'bg-marca hover:bg-marca-hover',
            )}
          >
            {listo ? (
              <Check key="ok" className="tilde size-5" aria-hidden />
            ) : (
              <Plus className="size-5" aria-hidden />
            )}
          </button>
        )}
      </div>
    </article>
  );
}
