import type { ReactNode } from 'react';
import { SesionProvider } from '@/features/auth/sesion';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">{children}</main>
    </SesionProvider>
  );
}
