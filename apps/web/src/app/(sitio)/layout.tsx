import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { obtenerSitio } from '@/features/sitio/datos';
import { fuentesDelLocal } from '@/lib/fuentes';
import './sitio.css';

/** ¿El fondo es oscuro? Define bordes y sombras que acompañan a la marca. */
function esOscuro(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

export async function generateMetadata(): Promise<Metadata> {
  const datos = await obtenerSitio();
  if (!datos) return {};
  const { local } = datos;
  const titulo = local.web.seo.titulo || local.nombre;
  const descripcion = local.web.seo.descripcion || local.descripcionCorta;
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return {
    ...(url ? { metadataBase: new URL(url) } : {}),
    title: { default: titulo, template: `%s · ${local.nombreCorto}` },
    description: descripcion,
    keywords: local.web.seo.keywords,
    icons: local.marca.faviconUrl ? { icon: local.marca.faviconUrl } : undefined,
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      siteName: local.nombre,
      title: titulo,
      description: descripcion,
      ...(local.marca.ogImageUrl ? { images: [{ url: local.marca.ogImageUrl }] } : {}),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const datos = await obtenerSitio();
  return { themeColor: datos?.local.marca.colorFondo ?? '#000000' };
}

export default async function SitioLayout({ children }: { children: ReactNode }) {
  const datos = await obtenerSitio();
  const marca = datos?.local.marca;
  const fuentes = fuentesDelLocal(marca?.fuenteTitulos ?? 'Inter', marca?.fuenteTexto ?? 'Inter');
  const oscuro = esOscuro(marca?.colorFondo ?? '#000000');

  const variables: Record<string, string> = {
    '--marca-primario': marca?.colorPrimario ?? '#f97316',
    '--marca-primario-hover': marca?.colorPrimarioHover ?? '#ea580c',
    '--marca-fondo': marca?.colorFondo ?? '#0a0a0a',
    '--marca-superficie': marca?.colorSuperficie ?? '#171717',
    '--marca-superficie-2': `color-mix(in oklab, ${marca?.colorSuperficie ?? '#171717'} 88%, ${oscuro ? '#fff' : '#000'})`,
    '--marca-texto': marca?.colorTexto ?? '#ffffff',
    '--marca-texto-2': marca?.colorTextoSecundario ?? '#d4d4d4',
    '--marca-borde': oscuro ? 'rgb(255 255 255 / 0.09)' : 'rgb(0 0 0 / 0.1)',
    '--fuente-titulos': fuentes.titulos,
    '--fuente-texto': fuentes.texto,
    'color-scheme': oscuro ? 'dark' : 'light',
  };
  // En :root (y no en el contenedor) para que las hojas que Radix monta en un portal también los vean.
  const css = `:root{${Object.entries(variables)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;

  return (
    <div className="sitio min-h-dvh">
      <style>{css}</style>
      {datos && datos.local.activo ? children : <VolvemosPronto nombre={datos?.local.nombre} />}
    </div>
  );
}

function VolvemosPronto({ nombre }: { nombre?: string | undefined }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-marca uppercase">{nombre ?? 'Estamos'}</p>
      <h1 className="font-titulos text-5xl">Volvemos pronto</h1>
      <p className="max-w-sm text-tinta-2">Estamos haciendo unos cambios. Gracias por la paciencia.</p>
    </main>
  );
}
