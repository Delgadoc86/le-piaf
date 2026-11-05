import type { ReactNode } from 'react';
import { SesionProvider } from '@/features/auth/sesion';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <main className="relative flex min-h-dvh items-center justify-center bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-hidden selection:bg-orange-500/30 selection:text-orange-200">
        {/* Halo sutil de iluminación ambiental de fondo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent blur-3xl opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-t from-slate-900 to-transparent blur-3xl opacity-80"
        />
        <div className="relative z-10 w-full flex justify-center">{children}</div>
      </main>
    </SesionProvider>
  );
}
