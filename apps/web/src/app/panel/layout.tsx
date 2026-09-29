import type { ReactNode } from 'react';
import { SesionProvider } from '@/features/auth/sesion';
import { MarcoPanel } from '@/components/panel/marco-panel';

export const metadata = { title: 'Panel' };

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <MarcoPanel>{children}</MarcoPanel>
    </SesionProvider>
  );
}
