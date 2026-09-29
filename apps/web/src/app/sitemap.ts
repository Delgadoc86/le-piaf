import type { MetadataRoute } from 'next';

/** Una sola página pública (la carta vive en "/"). */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return [{ url, changeFrequency: 'weekly', priority: 1 }];
}
