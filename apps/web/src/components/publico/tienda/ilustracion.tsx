/**
 * Ilustraciones por categoría: se usan donde todavía no hay foto real del producto.
 * Cuando el dueño sube la foto, <Miniatura> la muestra en su lugar sin tocar nada más.
 */
import Image from 'next/image';
import {
  Beer,
  CookingPot,
  CupSoda,
  Drumstick,
  Flame,
  Hamburger,
  Pizza,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type P = SVGProps<SVGSVGElement>;
const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Pancho (lucide no trae). Mismo trazo que los íconos de lucide. */
function Pancho(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...trazo} {...props}>
      <path d="M4 14c0-2.5 3.6-4 8-4s8 1.5 8 4-3.6 4-8 4-8-1.5-8-4Z" />
      <path d="M3 12.5c1.5-3.8 5-5.5 9-5.5s7.5 1.7 9 5.5" />
      <path d="M7 12.5c1-.8 1.5.8 2.5 0s1.5.8 2.5 0 1.5.8 2.5 0 1.5.8 2.5 0" />
    </svg>
  );
}

function Papas(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...trazo} {...props}>
      <path d="M5 11h14l-2 10H7L5 11Z" />
      <path d="M8 11 7 3M11 11V2M14 11l1-8M17 11l1.5-6" />
      <path d="M9 16a3 3 0 0 0 6 0" />
    </svg>
  );
}

function Empanada(props: P) {
  return (
    <svg viewBox="0 0 24 24" {...trazo} {...props}>
      <path d="M3 15a9 9 0 0 1 18 0v1H3v-1Z" />
      <path d="M5 16c.6-1 1.2-1 1.8 0s1.2 1 1.8 0 1.2-1 1.8 0 1.2 1 1.8 0 1.2-1 1.8 0 1.2 1 1.8 0 1.2-1 1.8 0" />
    </svg>
  );
}

type Icono = LucideIcon | ((p: P) => React.JSX.Element);

/** Nombre del ícono guardado en la categoría (seed.json → categorias[].icono). */
const POR_ICONO: Record<string, Icono> = {
  burger: Hamburger,
  sandwich: Sandwich,
  pizza: Pizza,
  empanada: Empanada,
  chicken: Drumstick,
  sausage: Flame,
  hotdog: Pancho,
  fries: Papas,
  drink: CupSoda,
  beer: Beer,
  'set-meal': CookingPot,
};

export function IconoCategoria({ icono, className }: { icono?: string | undefined; className?: string }) {
  const Componente = (icono && POR_ICONO[icono]) || UtensilsCrossed;
  return <Componente className={className} aria-hidden />;
}

interface MiniaturaProps {
  fotoUrl?: string | undefined;
  alt: string;
  icono?: string | undefined;
  sizes: string;
  className?: string;
  /** Tamaño del ícono cuando no hay foto. */
  iconoClassName?: string;
}

/** Foto del producto o, si no hay, la ilustración de su categoría sobre un degradé de la marca. */
export function Miniatura({ fotoUrl, alt, icono, sizes, className, iconoClassName = 'size-9' }: MiniaturaProps) {
  return (
    <div className={cn('relative overflow-hidden bg-superficie-2', className)}>
      {fotoUrl ? (
        <Image src={fotoUrl} alt={alt} fill sizes={sizes} className="zoom object-cover" />
      ) : (
        <div className="ilustracion absolute inset-0 flex items-center justify-center text-marca" role="img" aria-label={alt}>
          <IconoCategoria icono={icono} className={cn('zoom drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)]', iconoClassName)} />
        </div>
      )}
    </div>
  );
}
