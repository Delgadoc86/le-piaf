/** JSON-LD schema.org/Restaurant generado desde los datos del local (SILVERIO.md §5). */
import type { GrupoCarta } from '@/components/publico/tienda/menu';
import type { LocalPublico } from './datos';

const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function datosEstructurados(local: LocalPublico, grupos: GrupoCarta[]) {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  const redes = [local.contacto.instagram, local.contacto.facebook, local.contacto.tiktok].filter(
    Boolean,
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: local.nombre,
    description: local.web.seo.descripcion || local.descripcionCorta,
    ...(url ? { url, menu: `${url}/#carta` } : {}),
    ...(local.marca.logoUrl
      ? { logo: local.marca.logoUrl, image: local.marca.ogImageUrl || local.marca.logoUrl }
      : {}),
    telephone: `+${local.contacto.whatsapp}`,
    servesCuisine: grupos.map((g) => g.categoria.nombre),
    priceRange: '$$',
    acceptsReservations: false,
    hasMap: local.direccion.googleMapsUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: local.direccion.calle,
      addressLocality: local.direccion.localidad,
      addressRegion: local.direccion.provincia,
      postalCode: local.direccion.cp,
      addressCountry: local.direccion.pais,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: local.direccion.geo.lat,
      longitude: local.direccion.geo.lng,
    },
    openingHoursSpecification: local.horarios.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dias.map((d) => DIAS_SCHEMA[d]),
      opens: h.desde,
      closes: h.hasta,
    })),
    ...(redes.length > 0 ? { sameAs: redes } : {}),
  };
}
