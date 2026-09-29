import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { obtenerSitio } from '@/features/sitio/datos';
import { cssMarca } from '@/features/sitio/marca';
import './sitio.css';

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
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const datos = await obtenerSitio();
  return { themeColor: datos?.local.marca.colorFondo ?? '#000000' };
}

export default async function SitioLayout({ children }: { children: ReactNode }) {
  const datos = await obtenerSitio();
  const css = cssMarca(datos?.local.marca);

  return (
    <div className="sitio min-h-dvh">
      <style>{css}</style>
      {datos && datos.local.activo ? children : <VolvemosPronto nombre={datos?.local.nombre} />}
      {/* GA4 del local: se carga cuando la página ya terminó (lazyOnload), sin afectar PageSpeed. */}
      {datos?.local.web.ga4Id && process.env.NEXT_PUBLIC_USE_EMULATORS !== 'true' && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${datos.local.web.ga4Id}`}
            strategy="lazyOnload"
          />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${datos.local.web.ga4Id}');`}
          </Script>
        </>
      )}
    </div>
  );
}

function VolvemosPronto({ nombre }: { nombre?: string | undefined }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm tracking-[0.3em] text-marca uppercase">{nombre ?? 'Estamos'}</p>
      <h1 className="font-titulos text-5xl">Volvemos pronto</h1>
      <p className="max-w-sm text-tinta-2">
        Estamos haciendo unos cambios. Gracias por la paciencia.
      </p>
    </main>
  );
}
