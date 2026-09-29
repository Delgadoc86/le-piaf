'use client';

/** Accesos al carrito: botón de la barra superior y barra fija inferior (o WhatsApp si está vacío). */
import { ShoppingBag } from 'lucide-react';
import { formatARS } from '@app/shared';
import { useTiendaUI } from '@/features/carrito/store';
import { useLineasCarrito, useTienda } from '@/features/carrito/tienda';
import { linkWhatsApp } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { IconoWhatsApp } from '../iconos-marca';

export function BotonCarrito() {
  const { cantidad } = useLineasCarrito();
  const pulso = useTiendaUI((e) => e.pulso);
  const abrir = useTiendaUI((e) => e.abrirCarrito);
  return (
    <button
      type="button"
      onClick={() => abrir(true)}
      aria-label={cantidad > 0 ? `Ver pedido (${cantidad} productos)` : 'Ver pedido'}
      className="relative inline-flex size-11 items-center justify-center rounded-full bg-marca text-black transition-colors hover:bg-marca-hover focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2 focus-visible:ring-offset-fondo focus-visible:outline-none"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {cantidad > 0 && (
        <span
          key={pulso}
          className="rebote absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-fondo bg-tinta px-1 text-[11px] font-bold text-fondo tabular-nums"
        >
          {cantidad}
        </span>
      )}
    </button>
  );
}

export function BarraPedido() {
  const { cantidad, total } = useLineasCarrito();
  const { whatsapp } = useTienda();
  const pulso = useTiendaUI((e) => e.pulso);
  const abrir = useTiendaUI((e) => e.abrirCarrito);

  if (cantidad === 0) {
    return (
      <a
        href={linkWhatsApp(whatsapp, 'Hola, quiero hacer un pedido.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
        className="pulso fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] transition-transform duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none [--marca-primario:#25D366]"
      >
        <IconoWhatsApp className="size-7" />
      </a>
    );
  }

  return (
    <div className="barra-sube fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 md:p-0">
      <button
        type="button"
        onClick={() => abrir(true)}
        className={cn(
          'brillo relative flex h-15 w-full items-center gap-3 rounded-full bg-marca pr-6 pl-2 font-semibold text-black shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] transition-colors hover:bg-marca-hover md:w-auto md:min-w-80',
        )}
      >
        <span key={pulso} className="rebote inline-flex size-11 items-center justify-center rounded-full bg-black/85 text-sm font-bold text-marca tabular-nums">
          {cantidad}
        </span>
        <span className="flex-1 text-left">Ver pedido</span>
        <span className="tabular-nums">{formatARS(total)}</span>
      </button>
    </div>
  );
}
