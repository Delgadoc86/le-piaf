import type { MetadataRoute } from 'next';
import { NOMBRE_LOCAL } from '@/lib/local';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${NOMBRE_LOCAL} · Sistema Gastronómico`,
    short_name: NOMBRE_LOCAL,
    description: `Sistema integral de gestión de mostrador, comandas de cocina y caja para ${NOMBRE_LOCAL}.`,
    start_url: '/panel',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#0f172a',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

