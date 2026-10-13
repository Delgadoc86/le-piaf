import { getImageProps } from 'next/image';
import { cacheLife } from 'next/cache';
import { bannerVigente, type Banner } from '@app/shared';

/**
 * Banner de fecha especial debajo de la portada. Se decide en el servidor si corresponde hoy
 * (sin parpadeos ni saltos de layout); cacheLife('hours') hace que la página se regenere cada hora,
 * así el banner aparece y desaparece solo en sus fechas.
 */
export async function BannerFecha({
  banner,
  zonaHoraria,
}: {
  banner: Banner | undefined;
  zonaHoraria: string;
}) {
  'use cache';
  cacheLife('hours');
  if (!banner || !bannerVigente(banner, new Date(), zonaHoraria)) return null;

  const comun = { alt: banner.alt, sizes: '(min-width: 1152px) 1152px, 100vw', quality: 75 };
  const pc = getImageProps({ ...comun, src: banner.imagenPcUrl, width: 1600, height: 500 }).props;
  const movil = getImageProps({
    ...comun,
    src: banner.imagenMovilUrl,
    width: 1080,
    height: 1350,
  }).props;

  return (
    <section aria-label={banner.alt || 'Promoción especial'} className="px-4 pt-6 md:px-6 md:pt-8">
      <picture className="revelar borde-brillo mx-auto block max-w-6xl overflow-hidden rounded-[28px] border border-borde">
        <source media="(min-width: 768px)" srcSet={pc.srcSet || pc.src} sizes={comun.sizes} />
        <img
          {...movil}
          alt={banner.alt}
          className="aspect-[4/5] w-full object-cover md:aspect-[16/5]"
        />
      </picture>
    </section>
  );
}
