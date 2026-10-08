import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { NOMBRE_LOCAL } from '@/lib/local';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// Provisorio: en la Fase 1 el título, la descripción y el favicon salen de local/datos (SEO).
export const metadata: Metadata = {
  title: { default: NOMBRE_LOCAL, template: `%s · ${NOMBRE_LOCAL}` },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={cn('font-sans antialiased', plusJakartaSans.variable)}>
      <body>{children}</body>
    </html>
  );
}
