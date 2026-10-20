import type { CSSProperties } from 'react';
import { Clock, Flame, MapPin, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { ConfigPedidos, DatosHorario } from '@app/shared';
import { EstadoLocal } from '../estado-local';

interface Props {
  titulo: string;
  bajada: string;
  descripcion: string;
  localidad: string;
  heroDesktopUrl?: string;
  heroMovilUrl?: string;
  horario: DatosHorario;
  pedidos: ConfigPedidos;
}

/**
 * Portada nocturna con ambientación de leña y brasas:
 * Destaca la personalidad única de Le Piaf, alejándose de formatos rígidos
 * o plantillas prefabricadas.
 */
export function Portada(props: Props) {
  const formas = [
    props.pedidos.tipos.takeAway && 'Retiro en local',
    props.pedidos.tipos.delivery && 'Delivery',
    props.pedidos.tipos.salon && 'En el salón',
  ].filter(Boolean);

  const i = (n: number) => ({ '--i': n }) as CSSProperties;

  return (
    <section
      id="inicio"
      aria-label={props.titulo}
      className="relative overflow-hidden px-4 pt-28 pb-8 md:px-6 md:pt-36 md:pb-16"
    >
      {/* Resplandor ambiental de horno de barro / brasas cálidas */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.18),rgba(234,88,12,0.06)_50%,transparent_80%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-4xl text-center">
        {/* Sello artesanal de especialidad */}
        <div
          className="entrar inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold tracking-[0.25em] text-marca uppercase shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md"
          style={i(0)}
        >
          <Flame className="size-3.5 text-amber-400 animate-pulse" aria-hidden />
          <span>{props.bajada || 'Pizzas a la piedra · Lomos · Hamburguesas'}</span>
        </div>

        {/* Título de Marca Le Piaf con jerarquía gastronómica */}
        <h1
          className="entrar mt-5 font-titulos text-6xl tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]"
          style={i(1)}
        >
          {props.titulo}
        </h1>

        {/* Descripción / Bajada */}
        <p
          className="entrar mx-auto mt-4 max-w-xl text-base text-pretty text-tinta-2 sm:text-lg md:text-xl font-light leading-relaxed"
          style={i(2)}
        >
          {props.descripcion}
        </p>

        {/* 3 Pilares distintivos de Le Piaf (Diferenciales frente a rotiserías genéricas) */}
        <div
          className="entrar mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-tinta-2"
          style={i(3)}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-sm">
            🪵 Masa madre & cocción a la piedra
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-sm">
            🥩 Lomos de primera calidad
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-sm">
            🍕 Calzones & barrolucos
          </span>
        </div>

        {/* Botones de acción con resplandor cálido */}
        <div className="entrar mt-8 flex flex-wrap items-center justify-center gap-3.5" style={i(4)}>
          <a
            href="#carta"
            className="brillo inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 font-semibold text-black shadow-[0_4px_28px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-105 hover:from-amber-400 hover:to-amber-500 active:scale-95"
          >
            <UtensilsCrossed className="size-4" aria-hidden />
            Ver la carta
          </a>
          <a
            href="#promos"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-6 font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:bg-white/[0.09] active:scale-95"
          >
            Promociones del día
          </a>
        </div>

        {/* Información rápida en píldoras minimalistas */}
        <ul
          className="entrar mt-8 flex flex-wrap items-center justify-center gap-2"
          style={i(5)}
          aria-label="Información rápida del local"
        >
          <li>
            <EstadoLocal local={props.horario} />
          </li>
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-tinta-2 backdrop-blur-md">
            <MapPin className="size-3.5 text-marca" aria-hidden /> {props.localidad}
          </li>
          <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-tinta-2 backdrop-blur-md">
            <Clock className="size-3.5 text-marca" aria-hidden /> Mar a Dom 19:00 a 01:00 hs
          </li>
          {formas.length > 0 && (
            <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-tinta-2 backdrop-blur-md">
              <ShoppingBag className="size-3.5 text-marca" aria-hidden /> {formas.join(' · ')}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
