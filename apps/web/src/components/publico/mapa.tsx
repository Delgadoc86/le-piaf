'use client';

/**
 * Mapa con "facade": no carga Google Maps (~1 MB de JS) hasta que la persona lo pide.
 * Es de lo que más castiga a PageSpeed si se embebe directo.
 */
import { useState } from 'react';
import { MapPin } from 'lucide-react';

export function Mapa({ lat, lng, titulo }: { lat: number; lng: number; titulo: string }) {
  const [cargado, setCargado] = useState(false);

  if (cargado) {
    return (
      <iframe
        title={`Mapa: ${titulo}`}
        src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
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
      <span className="relative text-sm font-medium">Ver mapa</span>
    </button>
  );
}
