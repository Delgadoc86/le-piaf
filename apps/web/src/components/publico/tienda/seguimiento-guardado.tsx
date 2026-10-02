'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowUpRight, PackageCheck } from 'lucide-react';
import {
  leerUltimoPedido,
  obtenerUltimoPedidoGuardado,
  suscribirUltimoPedido,
} from '@/features/pedidos/ultimo-pedido';

export function SeguimientoGuardado() {
  const contenido = useSyncExternalStore(
    suscribirUltimoPedido,
    obtenerUltimoPedidoGuardado,
    () => null,
  );
  const pedido = leerUltimoPedido(contenido);

  if (!pedido) return null;

  return (
    <section aria-label="Seguimiento de tu pedido" className="px-4 md:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-y border-borde py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-marca/10 text-marca">
            <PackageCheck className="size-5" aria-hidden />
          </span>
          <p className="truncate text-sm font-medium">Tu pedido #{pedido.numero}</p>
        </div>
        <Link
          href={`/pedido/${encodeURIComponent(pedido.token)}`}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-marca px-4 text-sm font-semibold text-black transition-colors hover:bg-marca-hover focus-visible:ring-2 focus-visible:ring-marca focus-visible:ring-offset-2 focus-visible:ring-offset-fondo focus-visible:outline-none"
        >
          Ver seguimiento
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
