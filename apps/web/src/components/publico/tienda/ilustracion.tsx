/**
 * Ilustraciones SVG acordes y gastronómicas por categoría.
 * Se usan donde todavía no hay foto real del producto para que cada plato
 * tenga acompañamiento visual apetitoso. Cuando se sube la foto real,
 * <Miniatura> muestra la foto con protagonismo total.
 */
import Image from 'next/image';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type P = SVGProps<SVGSVGElement>;

/** Pizza a la piedra con queso gratinado, rodajas y albahaca */
function PizzaSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="24" cy="24" r="21" fill="#2A1B0E" stroke="#F59E0B" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="17.5" fill="#C2410C" />
      <circle cx="24" cy="24" r="16" fill="#FBBF24" opacity="0.9" />
      {/* Rodajas de tomate / pepperoni */}
      <circle cx="18" cy="18" r="4" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      <circle cx="30" cy="20" r="3.5" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      <circle cx="23" cy="29" r="4.2" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
      {/* Aceitunas negras */}
      <circle cx="16" cy="28" r="2.2" fill="#18181B" />
      <circle cx="29" cy="30" r="2" fill="#18181B" />
      <circle cx="25" cy="16" r="2" fill="#18181B" />
      {/* Hojas de albahaca / orégano */}
      <path d="M21 21C21 23 23 24 25 23C25 21 23 20 21 21Z" fill="#16A34A" />
      <path d="M32 26C33 28 35 28 35 26C34 25 32 25 32 26Z" fill="#16A34A" />
    </svg>
  );
}

/** Lomo completo en pan árabe / sándwich */
function LomoSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Pan superior */}
      <path
        d="M6 21C6 15 13 11 24 11C35 11 42 15 42 21H6Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      {/* Semillas / brillo */}
      <ellipse cx="18" cy="15" rx="1.5" ry="0.8" fill="#FEF3C7" />
      <ellipse cx="27" cy="14" rx="1.5" ry="0.8" fill="#FEF3C7" />
      <ellipse cx="33" cy="17" rx="1.5" ry="0.8" fill="#FEF3C7" />
      {/* Lechuga rizada */}
      <path
        d="M5 23C8 21 11 25 15 22C19 25 23 21 27 24C31 21 35 25 39 22C42 25 44 23 44 23"
        stroke="#22C55E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Tomate */}
      <rect x="7" y="24" width="34" height="3" rx="1.5" fill="#EF4444" />
      {/* Carne de lomo a la plancha */}
      <rect x="5" y="27" width="38" height="5" rx="2" fill="#78350F" />
      {/* Queso fundido */}
      <path d="M6 28C10 28 12 33 16 31C20 29 22 34 26 31C30 28 34 32 38 29L42 29" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
      {/* Pan inferior */}
      <path
        d="M6 32H42C42 36 36 39 24 39C12 39 6 36 6 32Z"
        fill="#D97706"
        stroke="#B45309"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Hamburguesa gourmet con queso cheddar */
function BurgerSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Pan superior abovedado */}
      <path
        d="M8 22C8 13 14 8 24 8C34 8 40 13 40 22H8Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      {/* Semillas de sésamo */}
      <circle cx="16" cy="14" r="1" fill="#FEF3C7" />
      <circle cx="24" cy="12" r="1" fill="#FEF3C7" />
      <circle cx="31" cy="15" r="1" fill="#FEF3C7" />
      <circle cx="21" cy="17" r="1" fill="#FEF3C7" />
      {/* Lechuga */}
      <path
        d="M6 24C10 22 14 26 18 23C22 26 26 22 30 25C34 22 38 26 42 23"
        stroke="#16A34A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Medallón de carne gruesa */}
      <rect x="7" y="25" width="34" height="6" rx="2.5" fill="#78350F" />
      {/* Queso cheddar derretido cayendo */}
      <path
        d="M8 29H40L36 34L28 31L22 36L16 30L12 34Z"
        fill="#F59E0B"
      />
      {/* Pan inferior */}
      <rect x="8" y="32" width="32" height="6" rx="3" fill="#D97706" />
    </svg>
  );
}

/** Calzone dorado y crocante */
function CalzoneSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Masa semicircular dorada */}
      <path
        d="M6 34C6 19 14 10 24 10C34 10 42 19 42 34H6Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      {/* Cortes de vapor superiores */}
      <line x1="18" y1="18" x2="21" y2="22" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="16" x2="25" y2="21" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="18" x2="28" y2="22" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      {/* Borde repulgue clásico */}
      <path
        d="M5 34C7 32 9 36 12 34C15 32 17 36 20 34C23 32 25 36 28 34C31 32 33 36 36 34C39 32 41 36 43 34"
        stroke="#B45309"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Gratinado / queso sutil */}
      <ellipse cx="24" cy="27" rx="8" ry="3" fill="#FEF3C7" opacity="0.6" />
    </svg>
  );
}

/** Súper Pancho con lluvia de papas pay */
function PanchoSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Pan alargado */}
      <rect x="6" y="16" width="36" height="18" rx="9" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
      {/* Salchicha vienesa */}
      <rect x="4" y="21" width="40" height="8" rx="4" fill="#DC2626" />
      {/* Hilo de mostaza / aderezo zig-zag */}
      <path
        d="M9 25C13 22 15 28 19 24C23 22 25 28 29 24C33 22 35 28 39 24"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Papas pay crujientes */}
      <line x1="14" y1="20" x2="16" y2="22" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="19" x2="25" y2="22" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="31" y1="20" x2="33" y2="22" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Empanada dorada con repulgue tradicional */
function EmpanadaSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Cuerpo en medialuna */}
      <path
        d="M6 32C6 18 15 12 24 12C33 12 42 18 42 32H6Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="1.5"
      />
      {/* Tostado al horno */}
      <ellipse cx="24" cy="22" rx="7" ry="4" fill="#B45309" opacity="0.4" />
      {/* Repulgue artesanal marcado */}
      <path
        d="M5 32C7 29 9 34 12 31C15 29 17 34 20 31C23 29 25 34 28 31C31 29 33 34 36 31C39 29 41 34 43 32"
        stroke="#92400E"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Papas fritas crocantes en cucurucho / porción */
function PapasSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Bastones de papas doradas */}
      <rect x="12" y="10" width="4" height="20" rx="1.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" transform="rotate(-10 12 10)" />
      <rect x="18" y="6" width="4" height="24" rx="1.5" fill="#FDE047" stroke="#D97706" strokeWidth="1" transform="rotate(-2 18 6)" />
      <rect x="25" y="7" width="4" height="23" rx="1.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" transform="rotate(5 25 7)" />
      <rect x="31" y="11" width="4" height="19" rx="1.5" fill="#FDE047" stroke="#D97706" strokeWidth="1" transform="rotate(12 31 11)" />
      {/* Envase / caja roja gastronómica */}
      <path
        d="M10 24L14 42H34L38 24C34 27 28 25 24 25C20 25 14 27 10 24Z"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="34" r="3.5" fill="#FBBF24" />
    </svg>
  );
}

/** Picada artesanal / fiambres y quesos */
function PicadaSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Tabla de madera */}
      <rect x="6" y="14" width="36" height="24" rx="4" fill="#78350F" stroke="#451A03" strokeWidth="1.5" />
      {/* Cubos de queso pategrás */}
      <rect x="11" y="18" width="6" height="6" rx="1" fill="#FDE047" />
      <rect x="19" y="18" width="6" height="6" rx="1" fill="#FBBF24" />
      <rect x="15" y="25" width="6" height="6" rx="1" fill="#FDE047" />
      {/* Rodajas de salame */}
      <circle cx="31" cy="21" r="4" fill="#B91C1C" />
      <circle cx="31" cy="21" r="1" fill="#FEF2F2" />
      <circle cx="30" cy="28" r="4" fill="#B91C1C" />
      <circle cx="30" cy="28" r="1" fill="#FEF2F2" />
      {/* Aceitunas con palillo */}
      <circle cx="24" cy="24" r="2.5" fill="#14532D" />
      <line x1="24" y1="21" x2="26" y2="15" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Menú del día / plato elaborado de cocina */
function MenuDiaSvg(props: P) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Plato hondo / campana cloche */}
      <path
        d="M10 28C10 18 16 12 24 12C32 12 38 18 38 28H10Z"
        fill="#475569"
        stroke="#334155"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="10" r="2.5" fill="#F59E0B" />
      {/* Borde del plato */}
      <rect x="6" y="28" width="36" height="4" rx="2" fill="#F59E0B" />
      {/* Vapores calientes aromáticos */}
      <path d="M18 7C17 5 19 3 18 1" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M24 6C23 4 25 2 24 0" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M30 7C29 5 31 3 30 1" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export const ICONOS_CATEGORIA: { clave: string; nombre: string }[] = [
  { clave: 'pizza', nombre: 'Pizza' },
  { clave: 'sandwich', nombre: 'Lomo / Sándwich' },
  { clave: 'burger', nombre: 'Hamburguesa' },
  { clave: 'calzone', nombre: 'Calzone' },
  { clave: 'hotdog', nombre: 'Pancho' },
  { clave: 'empanada', nombre: 'Empanada' },
  { clave: 'fries', nombre: 'Papas fritas' },
  { clave: 'sausage', nombre: 'Picada' },
  { clave: 'set-meal', nombre: 'Menú del día' },
];

/** Diccionario de SVGs gastronómicos según la clave de categoría */
const SVGS_POR_CLAVE: Record<string, (p: P) => React.JSX.Element> = {
  pizza: PizzaSvg,
  pizzas: PizzaSvg,
  sandwich: LomoSvg,
  lomos: LomoSvg,
  tostados: LomoSvg,
  burger: BurgerSvg,
  hamburguesas: BurgerSvg,
  calzone: CalzoneSvg,
  calzones: CalzoneSvg,
  hotdog: PanchoSvg,
  panchos: PanchoSvg,
  empanada: EmpanadaSvg,
  empanadas: EmpanadaSvg,
  fries: PapasSvg,
  papas: PapasSvg,
  'papas-fritas': PapasSvg,
  sausage: PicadaSvg,
  picadas: PicadaSvg,
  'set-meal': MenuDiaSvg,
  'menu-del-dia': MenuDiaSvg,
  promo: PromoComboSvg,
  combos: PromoComboSvg,
};

/** Combo gastronómico exclusivo: plato principal + papas doradas + chispa de oferta */
export function PromoComboSvg(props: P) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Resplandor cálido de fondo */}
      <circle cx="32" cy="32" r="28" fill="#F59E0B" fillOpacity="0.12" />
      
      {/* Bastones de papas fritas doradas al fondo */}
      <g transform="translate(30, 8)">
        <rect x="6" y="4" width="4" height="22" rx="2" fill="#FBBF24" stroke="#D97706" strokeWidth="1" transform="rotate(-15 6 4)" />
        <rect x="13" y="1" width="4" height="25" rx="2" fill="#FDE047" stroke="#D97706" strokeWidth="1" transform="rotate(-3 13 1)" />
        <rect x="20" y="3" width="4" height="23" rx="2" fill="#FBBF24" stroke="#D97706" strokeWidth="1" transform="rotate(10 20 3)" />
        <path d="M4 18L7 36H24L27 18C23 20 18 19 15 19C12 19 7 20 4 18Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1.2" />
      </g>

      {/* Sándwich / Burger en primer plano */}
      <g transform="translate(2, 14)">
        {/* Pan superior */}
        <path d="M8 20C8 11 15 6 26 6C37 6 44 11 44 20H8Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
        <ellipse cx="18" cy="12" rx="1.5" ry="0.8" fill="#FEF3C7" />
        <ellipse cx="27" cy="10" rx="1.5" ry="0.8" fill="#FEF3C7" />
        <ellipse cx="34" cy="14" rx="1.5" ry="0.8" fill="#FEF3C7" />
        {/* Lechuga rizada */}
        <path d="M6 22C10 20 13 24 18 21C22 24 26 20 31 23C35 20 40 24 45 21" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
        {/* Tomate */}
        <rect x="7" y="23" width="37" height="3" rx="1.5" fill="#EF4444" />
        {/* Queso cheddar derretido */}
        <path d="M8 26H43L40 31L32 28L25 33L18 28L13 32Z" fill="#FBBF24" />
        {/* Carne de lomo / medallón */}
        <rect x="7" y="28" width="37" height="6" rx="2" fill="#78350F" />
        {/* Pan inferior */}
        <rect x="8" y="34" width="35" height="5" rx="2.5" fill="#D97706" stroke="#B45309" strokeWidth="1.2" />
      </g>

      {/* Estrella chispeante de promo */}
      <path d="M52 14L53.5 18.5L58 20L53.5 21.5L52 26L50.5 21.5L46 20L50.5 18.5L52 14Z" fill="#F59E0B" />
      <path d="M12 10L13 12.5L15.5 13.5L13 14.5L12 17L11 14.5L8.5 13.5L11 12.5L12 10Z" fill="#FBBF24" opacity="0.8" />
    </svg>
  );
}


export function IconoCategoria({
  icono,
  className,
}: {
  icono?: string | undefined;
  className?: string;
}) {
  const Componente = (icono && SVGS_POR_CLAVE[icono.toLowerCase()]) || PizzaSvg;
  return <Componente className={className} aria-hidden />;
}

interface MiniaturaProps {
  fotoUrl?: string | undefined;
  alt: string;
  icono?: string | undefined;
  sizes: string;
  className?: string;
  iconoClassName?: string;
}

/**
 * Miniatura gastronómica protagonista:
 * - Si tiene foto real, luce en primer plano con zoom y calidad fotográfica.
 * - Si no tiene foto aún, muestra el SVG gastronómico de alta calidad correspondiente
 *   sobre una base cálida con iluminación de horno.
 */
export function Miniatura({
  fotoUrl,
  alt,
  icono,
  sizes,
  className,
  iconoClassName = 'size-14 md:size-16',
}: MiniaturaProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#22252F] via-[#181A22] to-[#101217] shadow-inner',
        className,
      )}
    >
      {fotoUrl ? (
        <Image
          src={fotoUrl}
          alt={alt}
          fill
          sizes={sizes}
          className="zoom object-cover transition-transform duration-500"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center p-2.5"
          role="img"
          aria-label={alt}
        >
          {/* Halo sutil de fondo para realzar el plato */}
          <div className="absolute inset-0 bg-radial from-amber-500/15 via-transparent to-transparent opacity-70" />
          <IconoCategoria
            icono={icono}
            className={cn(
              'zoom relative drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-110',
              iconoClassName,
            )}
          />
        </div>
      )}
    </div>
  );
}
