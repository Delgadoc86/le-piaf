'use client';

import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import type { ConfigPedidos, DatosHorario } from '@app/shared';

interface Props {
  titulo: string;
  bajada: string;
  descripcion: string;
  localidad: string;
  logoUrl?: string;
  telefono?: string;
  whatsapp?: string;
  heroDesktopUrl?: string;
  heroMovilUrl?: string;
  horario: DatosHorario;
  pedidos: ConfigPedidos;
}

/**
 * Desplazamiento lento y suave hacia una sección destino (easing profesional).
 */
function scrollLento(id: string, duracionMs = 850) {
  const el = document.getElementById(id);
  if (!el) return;
  const headerOffset = 90;
  const targetY = el.getBoundingClientRect().top + window.scrollY - headerOffset;
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start: number | null = null;

  function step(timestamp: number) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duracionMs, 1);
    // Easing cuadrático in-out suave
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.scrollTo(0, startY + diff * ease);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

/**
 * Portada Limpia & Auténtica de Le Piaf (Opción 2):
 * - Identidad caligráfica protagonista centrada, sin visores ni cajas artificiales.
 * - Fondo nocturno con sutil resplandor de brasas y horno a la leña.
 * - Botones directos con scroll suave y lento hacia Promos o Carta completa.
 * - Deja que las fotos de 1080×1080 brillen donde corresponden: en los combos y en la carta.
 */
export function Portada(props: Props) {
  return (
    <section
      id="inicio"
      aria-label={props.titulo}
      className="relative overflow-hidden px-4 pt-24 pb-14 sm:px-6 sm:pt-28 md:pt-36 md:pb-20"
    >
      {/* Resplandor ambiental de brasas cálidas sobre fondo grafito (#17181B) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(240,160,80,0.18),rgba(230,200,75,0.05)_50%,transparent_75%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-3xl text-center">
        

        {/* Logo oficial caligráfico de Le Piaf grande y centrado */}
        <div className="relative mx-auto my-3 flex max-w-xs sm:max-w-md md:max-w-xl items-center justify-center">
          <h1 className="sr-only">{props.titulo}</h1>
          <div className="relative h-24 w-80 sm:h-28 sm:w-96 md:h-36 md:w-[480px]">
            <Image
              src={props.logoUrl || '/marca/logo.webp'}
              alt={props.titulo}
              fill
              priority
              className="object-contain drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)]"
            />
          </div>
        </div>

        {/* Bajada oficial de la casa */}
        <p className="mx-auto mt-2 max-w-xl text-base text-balance text-[#E9E9EC]/90 sm:text-lg md:text-xl font-normal leading-relaxed drop-shadow-sm">
          {props.bajada || 'Pizzas a la piedra, lomos, hamburguesas y calzones en Maipú.'}
        </p>

        {/* Pilares distintivos de Le Piaf en texto continuo limpio (sin píldoras de WordPress) */}
        <p className="mt-3 text-xs sm:text-sm text-[#E9E9EC]/70 tracking-wide font-light">
          Cocción a la piedra &nbsp;·&nbsp; Lomos en pan árabe &nbsp;·&nbsp; Masa madre artesanal
        </p>

        {/* Botones de acción principales con Scroll Lento y Suave */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollLento('promos')}
            className="inline-flex h-13 min-w-52 items-center justify-center rounded-full bg-gradient-to-r from-[#F0A050] to-[#EA580C] px-8 font-bold text-black shadow-[0_6px_28px_rgba(240,160,80,0.45)] transition-all hover:scale-105 active:scale-95 text-base cursor-pointer"
          >
            Ver promociones del día
          </button>
          <button
            type="button"
            onClick={() => scrollLento('carta')}
            className="inline-flex h-13 min-w-52 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-8 font-semibold text-white shadow-md backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-white/[0.1] active:scale-95 text-base cursor-pointer"
          >
            <UtensilsCrossed className="size-4.5 text-amber-400" aria-hidden />
            Ver la carta completa
          </button>
        </div>
      </div>
    </section>
  );
}
