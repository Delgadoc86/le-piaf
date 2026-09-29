import type { ReactNode } from 'react';
import { SesionProvider } from '@/features/auth/sesion';
import { MarcoPanel } from '@/components/panel/marco-panel';

// Panel privado: se renderiza en el cliente después de validar la sesión (sin validación de navegación instantánea).
export const instant = false;

export const metadata = { title: 'Panel' };

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <MarcoPanel>{children}</MarcoPanel>
    </SesionProvider>
  );
}
