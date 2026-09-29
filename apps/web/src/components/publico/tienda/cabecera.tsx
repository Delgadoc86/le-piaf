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

/** Barra "isla": píldora flotante con desenfoque, separada de los bordes. */
export function Cabecera({ nombre, logoUrl, horario, anclas, conCarrito }: Props) {
  return (
    <header className="fixed inset-x-3 top-3 z-40 md:inset-x-6">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-full border border-borde bg-fondo/70 pr-1.5 pl-4 shadow-[0_12px_30px_-18px_rgb(0_0_0/0.9)] backdrop-blur-xl md:h-16 md:pl-6">
        <a
          href="#inicio"
          className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-marca focus-visible:outline-none"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={nombre}
              width={300}
              height={200}
              className="h-9 w-auto md:h-11"
              preload
            />
          ) : (
            <span className="font-titulos text-xl">{nombre}</span>
          )}
        </a>
        <nav aria-label="Secciones" className="ml-2 hidden items-center md:flex">
          {anclas.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-full px-4 py-2 text-sm text-tinta-2 transition-colors hover:bg-white/5 hover:text-tinta focus-visible:ring-2 focus-visible:ring-marca focus-visible:outline-none"
            >
              {a.texto}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <EstadoLocal
            local={horario}
            className="hidden border-transparent bg-white/5 sm:inline-flex"
          />
          {conCarrito && <BotonCarrito />}
        </div>
      </div>
    </header>
  );
}
