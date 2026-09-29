import path from 'node:path';
import type { NextConfig } from 'next';

const usaEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

const nextConfig: NextConfig = {
  // La web pública se prerenderiza con "use cache" y se invalida por etiqueta (ROADMAP §10).
  cacheComponents: true,
  // Monorepo con pnpm: las dependencias viven en la raíz (node_modules/.pnpm). Sin esto, la función
  // de Vercel puede quedar sin firebase-admin y todo lo que lee la base falla en tiempo de ejecución.
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Fotos del local en Firebase Storage (producción).
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/v0/b/**' },
      // Emulador de Storage (solo desarrollo).
      ...(usaEmuladores
        ? [{ protocol: 'http' as const, hostname: '127.0.0.1', port: '9199', pathname: '/v0/b/**' }]
        : []),
    ],
    // El optimizador de imágenes bloquea IPs locales; con el emulador hay que permitirlas.
    dangerouslyAllowLocalIP: usaEmuladores,
  },
};

export default nextConfig;
