import Image from 'next/image';
import type { DatosHorario } from '@app/shared';
import { EstadoLocal } from '../estado-local';
import { BotonCarrito } from './accesos-carrito';

interface Props {
  nombre: string;
  logoUrl: string;
  horario: DatosHorario;
  anclas: { href: string; texto: string }[];
  conCarrito: boolean;
}

/**
 * Cabecera estilo Bistró & Pizzería Gourmet:
 * Barra superior integrada con desenfoque de vidrio ahumado (smoked glass),
 * línea inferior tenue en degradé ámbar y acceso directo a carrito y secciones.
 */
export function Cabecera({ nombre, logoUrl, horario, anclas, conCarrito }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-amber-500/15 bg-[#0C0D12]/85 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Identidad de marca Le Piaf */}
        <a
          href="#inicio"
          className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca"
          aria-label={`Ir al inicio de ${nombre}`}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={nombre}
              width={260}
              height={70}
              className="h-9 w-auto md:h-11 transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)]"
              priority
            />
          ) : (
            <span className="font-titulos text-2xl font-bold tracking-wider text-white group-hover:text-marca transition-colors">
              {nombre}
            </span>
          )}
        </a>

        {/* Navegación central con micro-interacción */}
        <nav aria-label="Secciones del sitio" className="hidden items-center gap-1 md:flex">
          {anclas.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="relative rounded-lg px-4 py-2 text-sm font-medium text-tinta-2 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
            >
              {a.texto}
            </a>
          ))}
        </nav>

        {/* Estado y Carrito a la derecha */}
        <div className="flex items-center gap-3">
          <EstadoLocal
            local={horario}
            className="hidden sm:inline-flex border border-white/10 bg-white/[0.04] text-xs font-semibold backdrop-blur-md"
          />
          {conCarrito && (
            <div className="transition-transform duration-200 hover:scale-105 active:scale-95">
              <BotonCarrito />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
