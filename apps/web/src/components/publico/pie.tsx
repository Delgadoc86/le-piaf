import Image from 'next/image';
import { cacheLife } from 'next/cache';
import { resumirHorarios, type Contacto, type Horario } from '@app/shared';
import { linkWhatsApp } from '@/lib/whatsapp';
import { IconoFacebook, IconoInstagram, IconoTikTok, IconoWhatsApp } from './iconos-marca';

interface Props {
  nombre: string;
  descripcion: string;
  logoUrl: string;
  contacto: Contacto;
  horarios: Horario[];
  anclas: { href: string; texto: string }[];
}

/** El año se cachea por día: la página sigue siendo estática y el © se actualiza solo. */
async function AnioActual() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}

export function Pie({ nombre, descripcion, logoUrl, contacto, horarios, anclas }: Props) {
  const redes = [
    { href: linkWhatsApp(contacto.whatsapp), etiqueta: 'WhatsApp', Icono: IconoWhatsApp },
    contacto.instagram && {
      href: contacto.instagram,
      etiqueta: 'Instagram',
      Icono: IconoInstagram,
    },
    contacto.facebook && { href: contacto.facebook, etiqueta: 'Facebook', Icono: IconoFacebook },
    contacto.tiktok && { href: contacto.tiktok, etiqueta: 'TikTok', Icono: IconoTikTok },
  ].filter((r): r is { href: string; etiqueta: string; Icono: typeof IconoWhatsApp } => Boolean(r));

  return (
    <footer className="border-t border-borde bg-superficie/40">
      <div className="linea-marca" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          {logoUrl && (
            <Image src={logoUrl} alt={nombre} width={300} height={200} className="h-16 w-auto" />
          )}
          <p className="mt-4 max-w-xs text-sm text-tinta-2">{descripcion}</p>
          <ul className="mt-5 flex gap-2">
            {redes.map(({ href, etiqueta, Icono }) => (
              <li key={etiqueta}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={etiqueta}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-borde text-tinta-2 transition-colors hover:border-marca hover:text-marca focus-visible:ring-2 focus-visible:ring-marca focus-visible:outline-none"
                >
                  <Icono className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Enlaces del pie">
          <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-marca uppercase">
            Enlaces
          </p>
          <ul className="space-y-2.5 text-sm">
            {anclas.map((a) => (
              <li key={a.href}>
                <a href={a.href} className="text-tinta-2 transition-colors hover:text-tinta">
                  {a.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-marca uppercase">
            Horarios
          </p>
          <dl className="space-y-2.5 text-sm">
            {resumirHorarios(horarios).map((h) => (
              <div key={h.dias} className="flex justify-between gap-4">
                <dt className="text-tinta-2">{h.dias}</dt>
                <dd className="tabular-nums">{h.horas}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-borde">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-tinta-2 md:flex-row md:justify-between md:px-6 md:pb-6 max-md:pb-28">
          <p>
            © <AnioActual /> {nombre}. Todos los derechos reservados.
          </p>
          <p>
            Desarrollado por{' '}
            <a
              href="https://delgadodev-rho.vercel.app"
              target="_blank"
              rel="noopener"
              className="font-semibold text-tinta transition-colors hover:text-marca"
            >
              DelgadoDev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
