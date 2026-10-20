import Image from 'next/image';
import { Clock, Flame, MapPin, Navigation, Sparkles } from 'lucide-react';
import { resumirHorarios, type ContenidoWeb, type Direccion, type Horario } from '@app/shared';
import { Mapa } from '../mapa';

interface Props {
  nombre: string;
  nosotros: ContenidoWeb['nosotros'];
  galeria: ContenidoWeb['galeria'];
  direccion: Direccion;
  horarios: Horario[];
  mostrarNosotros: boolean;
  mostrarGaleria: boolean;
  mostrarUbicacion: boolean;
}

/**
 * Sección de Identidad & Ubicación con SEO Local:
 * Muestra la fachada del local Le Piaf (local.webp), historia, horarios
 * y el mapa oficial de Google Maps con la chincheta exacta en Ozamis y Vergara, Maipú.
 */
export function InfoLocal(p: Props) {
  const [primero, ...resto] = p.nosotros.parrafos;
  return (
    <section aria-labelledby="titulo-info" className="px-4 py-16 md:px-6 md:py-24">
      <div id="info" className="mx-auto max-w-6xl scroll-mt-28">
        <div className="mb-8">
          <span className="text-xs font-bold tracking-[0.28em] text-amber-400 uppercase">
            Identidad & Ubicación
          </span>
          <h2 id="titulo-info" className="mt-1 font-titulos text-4xl md:text-6xl font-bold tracking-tight text-white">
            El local de {p.nombre}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {/* Tarjeta del Local / Nosotros con foto y SEO */}
          {p.mostrarNosotros && (
            <article className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-[#14151F] to-[#0D0E14] shadow-lg backdrop-blur-md md:col-span-2 md:row-span-2">
              {p.nosotros.fotoUrl && (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={p.nosotros.fotoUrl}
                    alt="Fachada del local Le Piaf en Ozamis y Vergara, Maipú, Mendoza - Pizzería a la leña y lomitería artesanal"
                    title="Le Piaf - Ozamis y Vergara, Maipú, Mendoza"
                    fill
                    sizes="(min-width: 768px) 760px, 100vw"
                    className="zoom object-cover"
                    priority={false}
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#14151F] via-[#14151F]/40 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/10">
                    <Sparkles className="size-3 text-amber-400" /> Ozamis y Vergara · Maipú
                  </span>
                </div>
              )}
              <div className="-mt-6 relative z-10 space-y-4 p-6 sm:p-8">
                <h3 className="font-titulos text-3xl font-bold text-white sm:text-4xl">
                  {p.nosotros.titulo}
                </h3>
                {p.nosotros.frase && (
                  <p className="text-base sm:text-lg font-medium text-amber-400 text-balance">
                    {p.nosotros.frase}
                  </p>
                )}
                {primero && <p className="text-sm sm:text-base text-tinta-2 leading-relaxed">{primero}</p>}
                {resto.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer list-none font-medium text-amber-400 underline-offset-4 hover:underline text-sm [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Leer más sobre Le Piaf</span>
                      <span className="hidden group-open:inline">Mostrar menos</span>
                    </summary>
                    <div className="mt-3 space-y-3 text-sm text-tinta-2 leading-relaxed">
                      {resto.map((t, i) => (
                        <p key={i}>{t}</p>
                      ))}
                      {p.nosotros.cierre && <p className="font-medium text-white">{p.nosotros.cierre}</p>}
                    </div>
                  </details>
                )}
                {p.nosotros.tarjetas.length > 0 && (
                  <ul className="flex flex-wrap gap-2 pt-2">
                    {p.nosotros.tarjetas.map((t) => (
                      <li
                        key={t.titulo}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
                      >
                        {t.titulo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          )}

          {/* Horarios */}
          <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 shadow-md backdrop-blur-md">
            <h3 className="mb-4 flex items-center gap-2 font-titulos text-xl font-bold text-white">
              <Clock className="size-5 text-amber-400" aria-hidden /> Horarios de atención
            </h3>
            <dl className="space-y-3 text-sm">
              {resumirHorarios(p.horarios).map((h) => (
                <div
                  key={h.dias}
                  className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-tinta-2">{h.dias}</dt>
                  <dd className="font-bold text-white tabular-nums">{h.horas}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
              <p className="font-semibold">Lunes cerrado.</p>
              <p className="text-amber-300/80 mt-0.5">Martes a domingo con horno encendido de 19:00 a 01:00 hs.</p>
            </div>
          </article>

          {/* Ubicación y Mapa interactivo oficial */}
          {p.mostrarUbicacion && (
            <article className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] shadow-md backdrop-blur-md">
              <div className="aspect-[16/10] w-full">
                <Mapa lat={p.direccion.geo.lat} lng={p.direccion.geo.lng} titulo={p.nombre} />
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden />
                  <address className="not-italic text-sm">
                    <p className="font-bold text-white">{p.direccion.calle}</p>
                    <p className="text-tinta-2">
                      {[p.direccion.localidad, p.direccion.departamento, p.direccion.provincia]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </address>
                </div>
                <a
                  href={p.direccion.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brillo relative mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-black transition-all duration-300 hover:scale-105 hover:from-amber-400 hover:to-amber-500 shadow-md"
                >
                  <Navigation className="size-4" aria-hidden /> Cómo llegar en Google Maps
                </a>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
