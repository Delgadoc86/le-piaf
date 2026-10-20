'use client';

/**
 * Carrusel de Promociones:
 * Otorga protagonismo individual a cada promo sin scroll vertical infinito.
 * Desplazable horizontalmente en celular (swipe con snap) y con controles flecha en PC.
 */
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { formatARS, promoVigente } from '@app/shared';
import type { PromoPublica } from '@/features/sitio/datos';
import { useCarrito, useTiendaUI } from '@/features/carrito/store';
import { useTienda } from '@/features/carrito/tienda';
import { cn } from '@/lib/utils';
import { PromoComboSvg } from './ilustracion';

export function PromosBento({
  promos,
  zonaHoraria,
}: {
  promos: PromoPublica[];
  zonaHoraria: string;
}) {
  const [vigentes, setVigentes] = useState(promos);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const carruselRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const calcular = () =>
      setVigentes(promos.filter((p) => promoVigente(p, new Date(), zonaHoraria)));
    calcular();
    const id = setInterval(calcular, 60_000);
    return () => clearInterval(id);
  }, [promos, zonaHoraria]);

  // Actualizar índice activo al desplazarse
  const alScrollear = () => {
    const el = carruselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 16 : 380;
    const index = Math.round(scrollLeft / cardWidth);
    setIndiceActivo(Math.min(Math.max(0, index), vigentes.length - 1));
  };

  const deslizar = (direccion: 'izq' | 'der') => {
    const el = carruselRef.current;
    if (!el) return;
    const paso = (el.firstElementChild as HTMLElement)?.offsetWidth || 380;
    el.scrollBy({
      left: direccion === 'izq' ? -paso - 16 : paso + 16,
      behavior: 'smooth',
    });
  };

  if (vigentes.length === 0) {
    return <p className="text-tinta-2">No hay promociones disponibles en este momento.</p>;
  }

  return (
    <div className="relative">
      {/* Controles de navegación y contador en escritorio / tablet */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {vigentes.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const el = carruselRef.current;
                if (!el?.children[i]) return;
                (el.children[i] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
              aria-label={`Ir a promo ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === indiceActivo ? 'w-6 bg-marca' : 'w-2 bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
          <span className="ml-2 text-xs font-semibold tabular-nums text-tinta-2">
            {indiceActivo + 1} / {vigentes.length}
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => deslizar('izq')}
            aria-label="Promoción anterior"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-tinta transition-all hover:border-marca/40 hover:bg-white/10 hover:text-marca active:scale-90"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => deslizar('der')}
            aria-label="Siguiente promoción"
            className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-tinta transition-all hover:border-marca/40 hover:bg-white/10 hover:text-marca active:scale-90"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Riel horizontal con snap para swipe fluido y protagonismo */}
      <ul
        ref={carruselRef}
        onScroll={alScrollear}
        className="carrusel -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-1 snap-x snap-mandatory scroll-smooth md:-mx-2 md:px-2 md:gap-5"
      >
        {vigentes.map((p) => (
          <li
            key={p.id}
            className="w-[84vw] max-w-[380px] shrink-0 snap-center sm:w-[360px] md:w-[390px]"
          >
            <TarjetaPromo promo={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaPromo({ promo: p }: { promo: PromoPublica }) {
  const agregar = useCarrito((e) => e.agregar);
  const avisar = useTiendaUI((e) => e.avisarAgregado);
  const [listo, setListo] = useState(false);
  const conCarrito = useTienda().pedidos.habilitados;

  function sumar() {
    agregar({ tipo: 'promo', promoId: p.id, cantidad: 1 });
    avisar();
    setListo(true);
    setTimeout(() => setListo(false), 1100);
  }

  return (
    <article className="group relative isolate flex h-[22rem] md:h-[24rem] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-t from-black via-[#181A22]/90 to-[#22252F] p-5 shadow-lg transition-all duration-300 hover:border-marca/40">
      {/* Imagen real del combo o ilustración gastronómica si no hay foto */}
      {p.fotoUrl ? (
        <Image
          src={p.fotoUrl}
          alt={p.titulo}
          fill
          sizes="(min-width: 768px) 400px, 84vw"
          className="zoom -z-10 object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 -z-10 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#241E15] via-[#16171E] to-[#0E0F14]">
          <div className="absolute inset-0 bg-radial from-amber-500/20 via-transparent to-transparent opacity-80" />
          <PromoComboSvg className="size-36 opacity-85 drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:scale-110" />
        </div>
      )}

      {/* Degradé protector para legibilidad del texto */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/65 to-transparent"
        aria-hidden
      />

      {/* Badge de Promo */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-marca px-3 py-1 text-[11px] font-bold tracking-wider text-black uppercase shadow-md">
        <Sparkles className="size-3" aria-hidden />
        Promo Exclusiva
      </div>

      {/* Contenido de la promo con protagonismo */}
      <div className="relative">
        <h3 className="font-titulos text-2xl font-bold tracking-tight text-white drop-shadow-sm md:text-3xl text-balance">
          {p.titulo}
        </h3>
        {p.descripcion && (
          <p className="mt-1.5 line-clamp-2 text-sm text-tinta-2 drop-shadow-sm">
            {p.descripcion}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 pt-2">
          <div>
            <span className="block text-[11px] font-semibold tracking-wider text-tinta-2 uppercase">Precio promo</span>
            <span className="font-titulos text-3xl font-bold text-marca tabular-nums">
              {formatARS(p.precio)}
            </span>
          </div>

          {conCarrito && (
            <button
              type="button"
              onClick={sumar}
              aria-label={`Agregar ${p.titulo}`}
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 font-semibold text-black shadow-lg transition-all duration-300 active:scale-90',
                listo ? 'bg-emerald-400' : 'bg-marca hover:bg-marca-hover hover:scale-105',
              )}
            >
              {listo ? (
                <>
                  <Check className="tilde size-5" aria-hidden />
                  <span>Listo</span>
                </>
              ) : (
                <>
                  <Plus className="size-5" aria-hidden />
                  <span>Agregar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
