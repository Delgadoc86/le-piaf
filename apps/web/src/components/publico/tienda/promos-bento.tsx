'use client';

/**
 * Promos en mosaico (bento): la primera vigente es la protagonista. En celular, la destacada
 * ocupa el ancho y el resto se desliza; en escritorio, grilla 4×2. Agregan directo al carrito.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Plus } from 'lucide-react';
import { formatARS, promoVigente } from '@app/shared';
import type { PromoPublica } from '@/features/sitio/datos';
import { useCarrito, useTiendaUI } from '@/features/carrito/store';
import { cn } from '@/lib/utils';

export function PromosBento({ promos, zonaHoraria }: { promos: PromoPublica[]; zonaHoraria: string }) {
  // Se renderizan todas en el servidor; en el navegador se ocultan las que no rigen ahora.
  const [vigentes, setVigentes] = useState(promos);
  useEffect(() => {
    const calcular = () => setVigentes(promos.filter((p) => promoVigente(p, new Date(), zonaHoraria)));
    calcular();
    const id = setInterval(calcular, 60_000);
    return () => clearInterval(id);
  }, [promos, zonaHoraria]);

  if (vigentes.length === 0) {
    return <p className="text-tinta-2">No hay promociones disponibles en este momento.</p>;
  }
  const [destacada, ...resto] = vigentes;

  return (
    <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
      <TarjetaPromo promo={destacada!} grande className="md:col-span-2 md:row-span-2" />
      <ul className="carrusel -mx-4 flex gap-3 overflow-x-auto px-4 md:contents">
        {resto.slice(0, 4).map((p) => (
          <li key={p.id} className="w-[72%] shrink-0 sm:w-[46%] md:w-auto">
            <TarjetaPromo promo={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaPromo({ promo: p, grande = false, className }: { promo: PromoPublica; grande?: boolean; className?: string }) {
  const agregar = useCarrito((e) => e.agregar);
  const avisar = useTiendaUI((e) => e.avisarAgregado);
  const [listo, setListo] = useState(false);

  function sumar() {
    agregar({ tipo: 'promo', promoId: p.id, cantidad: 1 });
    avisar();
    setListo(true);
    setTimeout(() => setListo(false), 1100);
  }

  return (
    <article
      className={cn(
        'revelar elevar borde-brillo group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[28px] border border-borde bg-superficie',
        grande ? 'min-h-[22rem] md:min-h-0' : 'min-h-[15rem] md:min-h-[13rem]',
        className,
      )}
    >
      {p.fotoUrl && (
        <Image
          src={p.fotoUrl}
          alt={p.titulo}
          fill
          sizes={grande ? '(min-width: 768px) 560px, 92vw' : '(min-width: 768px) 280px, 72vw'}
          className="zoom -z-10 object-cover"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/0" aria-hidden />

      <span className="absolute top-3 left-3 rounded-full bg-marca px-2.5 py-1 text-[10px] font-bold tracking-wider text-black uppercase">
        Promo
      </span>

      <div className={cn('flex items-end gap-3', grande ? 'p-5 md:p-7' : 'p-4')}>
        <div className="min-w-0 flex-1">
          <h3 className={cn('font-semibold text-balance', grande ? 'text-2xl md:text-3xl' : 'text-base')}>{p.titulo}</h3>
          {grande && p.descripcion && <p className="mt-1 line-clamp-2 text-sm text-white/75">{p.descripcion}</p>}
          <p className={cn('mt-2 font-bold text-marca tabular-nums', grande ? 'text-2xl' : 'text-lg')}>
            {formatARS(p.precio)}
          </p>
        </div>
        <button
          type="button"
          onClick={sumar}
          aria-label={`Agregar ${p.titulo}`}
          className={cn(
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold text-black shadow-lg transition-[background-color,transform] duration-300 active:scale-90',
            listo ? 'bg-emerald-400' : 'bg-marca hover:bg-marca-hover',
            grande ? 'h-12 px-5' : 'size-11',
          )}
        >
          {listo ? <Check key="ok" className="tilde size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
          {grande && <span>{listo ? 'Listo' : 'Agregar'}</span>}
        </button>
      </div>
    </article>
  );
}
