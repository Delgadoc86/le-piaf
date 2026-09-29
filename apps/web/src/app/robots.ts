import type { MetadataRoute } from 'next';

/** Buscadores: la web pública sí; el panel, el login y la API no. */
export default function robots(): MetadataRoute.Robots {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/panel', '/login', '/api/'] },
    ...(url ? { sitemap: `${url}/sitemap.xml` } : {}),
  };
}
