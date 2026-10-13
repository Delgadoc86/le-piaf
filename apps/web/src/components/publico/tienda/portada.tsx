import type { CSSProperties } from 'react';
import { getImageProps } from 'next/image';
import { Clock, MapPin, ShoppingBag } from 'lucide-react';
import type { ConfigPedidos, DatosHorario } from '@app/shared';
import { EstadoLocal } from '../estado-local';

interface Props {
  titulo: string;
  bajada: string;
  descripcion: string;
  localidad: string;
  heroDesktopUrl: string;
  heroMovilUrl: string;
  horario: DatosHorario;
  pedidos: ConfigPedidos;
}

/**
 * Portada tipo "ficha del local" de una app: tarjeta con la ilustración de la marca + datos
 * rápidos (estado, cómo pedir, tiempo). Ocupa media pantalla: la carta se ve enseguida.
 */
export function Portada(props: Props) {
  const comun = { alt: '', sizes: '(min-width: 1152px) 1152px, 100vw', quality: 75 };
  const escritorio = props.heroDesktopUrl
    ? getImageProps({ ...comun, src: props.heroDesktopUrl, width: 1920, height: 1080 }).props
    : null;
  const movil = props.heroMovilUrl
    ? getImageProps({
        ...comun,
        src: props.heroMovilUrl,
        width: 1080,
        height: 1920,
        loading: 'eager',
        fetchPriority: 'high',
      }).props
    : null;

  const formas = [
    props.pedidos.tipos.takeAway && 'Retiro',
    props.pedidos.tipos.delivery && 'Delivery',
    props.pedidos.tipos.salon && 'En el local',
  ].filter(Boolean);

  const chip =
    'inline-flex h-8 items-center gap-1.5 rounded-full border border-borde bg-white/5 px-3 text-xs font-medium text-tinta-2';
  const i = (n: number) => ({ '--i': n }) as CSSProperties;

  return (
    <section
      id="inicio"
      aria-label={props.titulo}
      className="resplandor px-4 pt-20 md:px-6 md:pt-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="borde-brillo relative isolate overflow-hidden rounded-[32px] border border-borde bg-superficie">
          {movil && escritorio && (
            <picture>
              <source media="(min-width: 768px)" srcSet={escritorio.srcSet || escritorio.src} sizes={comun.sizes} />
              <img
                {...movil}
                alt=""
                className="asentar aspect-[5/4] w-full object-cover object-[50%_18%] md:aspect-[12/5] md:object-center"
              />
            </picture>
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-superficie via-transparent to-transparent md:bg-gradient-to-r md:from-superficie md:via-superficie/60"
            aria-hidden
          />

          {/* Escritorio: texto sobre la zona libre de la ilustración. */}
          <div className="absolute inset-y-0 left-0 hidden max-w-lg flex-col justify-center p-12 md:flex">
            <p
              className="entrar text-xs font-semibold tracking-[0.35em] text-marca uppercase"
              style={i(0)}
            >
              {props.bajada}
            </p>
            <h1 className="entrar mt-3 font-titulos text-7xl leading-none" style={i(1)}>
              {props.titulo}
            </h1>
            <p className="entrar mt-4 text-lg text-pretty text-tinta-2" style={i(2)}>
              {props.descripcion}
            </p>
          </div>
        </div>

        {/* Celular: título tipo app debajo de la tarjeta (la ilustración ya dice "Silverio"). */}
        <div className="mt-5 md:hidden">
          <p
            className="entrar text-[11px] font-semibold tracking-[0.3em] text-marca uppercase"
            style={i(0)}
          >
            {props.bajada}
          </p>
          <p className="entrar mt-1 font-titulos text-4xl leading-tight" style={i(1)} aria-hidden>
            ¿Qué pedimos hoy?
          </p>
          {/* Un solo h1 visible para lectores de pantalla según el tamaño (el otro está oculto con display:none). */}
          <h1 className="sr-only">{props.titulo}</h1>
        </div>

        <ul
          className="entrar mt-4 flex flex-wrap gap-2 md:mt-5"
          style={i(3)}
          aria-label="Información rápida"
        >
          <li>
            <EstadoLocal local={props.horario} />
          </li>
          {formas.length > 0 && (
            <li className={chip}>
              <ShoppingBag className="size-3.5 text-marca" aria-hidden /> {formas.join(' · ')}
            </li>
          )}
          {props.pedidos.tiempoEstimadoMin > 0 && (
            <li className={chip}>
              <Clock className="size-3.5 text-marca" aria-hidden /> ~
              {props.pedidos.tiempoEstimadoMin} min
            </li>
          )}
          <li className={chip}>
            <MapPin className="size-3.5 text-marca" aria-hidden /> {props.localidad}
          </li>
        </ul>
      </div>
    </section>
  );
}
