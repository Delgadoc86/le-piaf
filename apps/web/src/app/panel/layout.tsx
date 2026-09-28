import type { ReactNode } from 'react';
import { SesionProvider } from '@/features/auth/sesion';
import { RequiereSesion } from '@/components/panel/requiere-sesion';

export const metadata = { title: 'Panel' };

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <RequiereSesion>{children}</RequiereSesion>
    </SesionProvider>
  );
}
