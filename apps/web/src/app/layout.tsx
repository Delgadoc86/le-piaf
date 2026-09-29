import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import { NOMBRE_LOCAL } from '@/lib/local';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

// Provisorio: en la Fase 1 el título, la descripción y el favicon salen de local/datos (SEO).
export const metadata: Metadata = {
  title: { default: NOMBRE_LOCAL, template: `%s · ${NOMBRE_LOCAL}` },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={cn('font-sans', geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
