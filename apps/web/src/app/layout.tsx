import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'MiMenu', template: '%s · MiMenu' },
  description: 'Carta digital, pedidos sin comisión, salón, cocina y caja para tu local.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={cn('font-sans', geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
