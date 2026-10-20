'use client';

/**
 * Mapa con "facade": no carga Google Maps (~1 MB de JS) hasta que la persona lo pide.
 * Es de lo que más cuida el PageSpeed en móviles, y al hacer clic carga el mapa interactivo real.
 */
import { useState } from 'react';
import { MapPin } from 'lucide-react';

const MAPA_EMBED_OFICIAL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d703.5670819592394!2d-68.79073843158167!3d-32.9840518688525!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x967e0cbec4b998bd%3A0xea46e474f29337a7!2sLe%20Piaf!5e0!3m2!1ses!2sar!4v1792453944755!5m2!1ses!2sar';

export function Mapa({
  lat,
  lng,
  titulo,
  embedUrl = MAPA_EMBED_OFICIAL,
}: {
  lat: number;
  lng: number;
  titulo: string;
  embedUrl?: string;
}) {
  const [cargado, setCargado] = useState(false);

  if (cargado) {
    return (
      <iframe
        title={`Ubicación de ${titulo} en Google Maps`}
        src={embedUrl || `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCargado(true)}
      className="group relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-superficie text-tinta-2 transition-colors hover:text-tinta"
    >
      {/* Trama tipo plano (CSS puro, sin imágenes). */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--marca-borde)_1px,transparent_1px),linear-gradient(90deg,var(--marca-borde)_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-marca text-black shadow-[0_0_0_10px_color-mix(in_oklab,var(--marca-primario)_18%,transparent)] transition-transform duration-500 group-hover:scale-110">
        <MapPin className="size-6" aria-hidden />
      </span>
      <span className="relative text-sm font-medium">Ver mapa en vivo</span>
    </button>
  );
}
