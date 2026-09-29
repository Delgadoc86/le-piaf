import Image from 'next/image';
import { Clock, MapPin, Navigation } from 'lucide-react';
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
 * Info del local en tarjetas compactas (bento): historia, horarios y ubicación.
 * El que entra quiere pedir: esto va al final y se lee de un vistazo.
 */
export function InfoLocal(p: Props) {
  const [primero, ...resto] = p.nosotros.parrafos;
  return (
    <section aria-labelledby="titulo-info" className="px-4 py-16 md:px-6 md:py-24">
      <div id="info" className="mx-auto max-w-6xl scroll-mt-28">
        <p className="text-xs font-semibold tracking-[0.28em] text-marca uppercase">Conocenos</p>
        <h2 id="titulo-info" className="mt-2 mb-8 font-titulos text-4xl md:text-5xl">
          {p.nombre}
        </h2>

        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {p.mostrarNosotros && (
            <article className="revelar borde-brillo overflow-hidden rounded-[28px] border border-borde bg-superficie md:col-span-2 md:row-span-2">
              {p.nosotros.fotoUrl && (
                <div className="relative aspect-[16/9]">
                  <Image
                    src={p.nosotros.fotoUrl}
                    alt={`${p.nombre} en acción`}
                    fill
                    sizes="(min-width: 768px) 740px, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-superficie to-transparent" aria-hidden />
                </div>
              )}
              <div className="-mt-10 space-y-4 p-6 md:p-8">
                <h3 className="relative font-titulos text-3xl">{p.nosotros.titulo}</h3>
                {p.nosotros.frase && <p className="text-lg font-medium text-marca text-balance">{p.nosotros.frase}</p>}
                {primero && <p className="text-tinta-2">{primero}</p>}
                {resto.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer list-none font-medium text-tinta underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Leer la historia completa</span>
                      <span className="hidden group-open:inline">Mostrar menos</span>
                    </summary>
                    <div className="mt-3 space-y-3 text-tinta-2">
                      {resto.map((t, i) => (
                        <p key={i}>{t}</p>
                      ))}
                      {p.nosotros.cierre && <p>{p.nosotros.cierre}</p>}
                    </div>
                  </details>
                )}
                {p.nosotros.tarjetas.length > 0 && (
                  <ul className="flex flex-wrap gap-2 pt-2">
                    {p.nosotros.tarjetas.map((t) => (
                      <li key={t.titulo} className="rounded-full border border-borde bg-white/5 px-3 py-1.5 text-xs font-medium">
                        {t.titulo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          )}

          <article className="revelar borde-brillo rounded-[28px] border border-borde bg-superficie p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Clock className="size-5 text-marca" aria-hidden /> Horarios
            </h3>
            <dl className="space-y-3">
              {resumirHorarios(p.horarios).map((h) => (
                <div key={h.dias} className="flex items-baseline justify-between gap-4 border-b border-borde pb-3 last:border-0 last:pb-0">
                  <dt className="text-tinta-2">{h.dias}</dt>
                  <dd className="font-semibold tabular-nums">{h.horas}</dd>
                </div>
              ))}
            </dl>
          </article>

          {p.mostrarUbicacion && (
            <article className="revelar borde-brillo flex flex-col overflow-hidden rounded-[28px] border border-borde bg-superficie">
              <div className="aspect-[16/9]">
                <Mapa lat={p.direccion.geo.lat} lng={p.direccion.geo.lng} titulo={p.nombre} />
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
                  <address className="not-italic">
                    <p className="font-semibold">{p.direccion.calle}</p>
                    <p className="text-sm text-tinta-2">
                      {[p.direccion.localidad, p.direccion.departamento, p.direccion.provincia].filter(Boolean).join(', ')}
                    </p>
                  </address>
                </div>
                <a
                  href={p.direccion.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brillo relative mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-marca font-semibold whitespace-nowrap text-black transition-colors hover:bg-marca-hover"
                >
                  <Navigation className="size-4" aria-hidden /> Cómo llegar
                </a>
              </div>
            </article>
          )}
        </div>

        {p.mostrarGaleria && p.galeria.length > 0 && (
          <ul className="carrusel -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 md:mx-0 md:mt-4 md:grid md:grid-cols-3 md:gap-4 md:px-0">
            {p.galeria.map((f) => (
              <li key={f.fotoUrl} className="w-[70%] shrink-0 md:w-auto">
                <figure className="revelar elevar relative aspect-[4/3] overflow-hidden rounded-[24px] border border-borde">
                  <Image src={f.fotoUrl} alt={f.titulo} fill sizes="(min-width: 768px) 370px, 70vw" className="zoom object-cover" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pt-10 pb-3 text-sm font-semibold">
                    {f.titulo}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
