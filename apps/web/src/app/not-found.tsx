import Link from 'next/link';
import { obtenerSitio } from '@/features/sitio/datos';
import { cssMarca } from '@/features/sitio/marca';
import './(sitio)/sitio.css';

export const metadata = { title: 'Página no encontrada' };

/** 404 con la marca del local: lleva de vuelta a la carta. */
export default async function NoEncontrada() {
  const datos = await obtenerSitio();
  return (
    <div className="sitio resplandor flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <style>{cssMarca(datos?.local.marca)}</style>
      <p className="text-xs font-semibold tracking-[0.3em] text-marca uppercase">Error 404</p>
      <h1 className="font-titulos text-5xl md:text-6xl">Acá no hay nada</h1>
      <p className="max-w-sm text-tinta-2">
        La página que buscás no existe o cambió de lugar. Pero la carta sigue donde siempre.
      </p>
      <Link
        href="/#carta"
        className="brillo relative inline-flex h-12 items-center rounded-full bg-marca px-7 font-semibold text-black transition-colors hover:bg-marca-hover"
      >
        Ver la carta
      </Link>
    </div>
  );
}
