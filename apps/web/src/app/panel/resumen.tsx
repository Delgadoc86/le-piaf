'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  claveJornada,
  DOC_LOCAL,
  esperadoCaja,
  formatARS,
  ticketPromedio,
  type Local,
  type StatsDiarias,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { useSesion } from '@/features/auth/sesion';
import { useDocumento } from '@/features/panel/firestore';
import { useCajaAbierta, useMovimientos } from '@/features/panel/caja';
import { NOMBRE_LOCAL } from '@/lib/local';

/** Inicio del panel: cómo viene el día (ventas cobradas y caja) y accesos rápidos. */
export default function ResumenPage() {
  const sesion = useSesion();
  const local = useDocumento<Local>(DOC_LOCAL);
  const gestor =
    sesion.estado === 'lista' && (sesion.rol === 'dueno' || sesion.rol === 'encargado');
  const zona = local.datos?.zonaHoraria;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Resumen</h1>
          <p className="text-muted-foreground">{NOMBRE_LOCAL}</p>
        </div>
        <Button asChild>
          <Link href="/panel/pedidos">
            Ver pedidos <ArrowRight />
          </Link>
        </Button>
      </header>
      {gestor && zona && <Numeros zona={zona} />}
    </div>
  );
}

function Numeros({ zona }: { zona: string }) {
  const [hoy] = useState(() => claveJornada(new Date(), zona));
  const stats = useDocumento<StatsDiarias>(`statsDiarias/${hoy}`);
  const { turno, cargando } = useCajaAbierta();
  const movimientos = useMovimientos(turno?.id ?? null);
  const s = stats.datos;
  const ventas = s?.ventas ?? 0;
  const pedidos = s?.pedidos ?? 0;

  return (
    <>
      <section aria-label="Hoy" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Dato titulo="Vendido hoy" valor={formatARS(ventas)} />
        <Dato titulo="Pedidos cobrados" valor={String(pedidos)} />
        <Dato titulo="Ticket promedio" valor={formatARS(ticketPromedio(ventas, pedidos))} />
        <Dato
          titulo="Efectivo / transferencias"
          valor={`${formatARS(s?.porMedio.efectivo ?? 0)}`}
          detalle={`Transf. ${formatARS(s?.porMedio.transferencia ?? 0)}`}
        />
      </section>
      {!cargando && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          {turno ? (
            <p>
              <span className="font-medium">Caja abierta.</span>{' '}
              <span className="text-muted-foreground">
                Tendría que haber {formatARS(esperadoCaja(turno, movimientos.datos).efectivo)} en
                efectivo.
              </span>
            </p>
          ) : (
            <p>
              <span className="font-medium">La caja está cerrada.</span>{' '}
              <span className="text-muted-foreground">Abrila al empezar el servicio.</span>
            </p>
          )}
          <Button variant="outline" asChild>
            <Link href="/panel/caja">Ir a la caja</Link>
          </Button>
        </section>
      )}
      <p className="text-sm text-muted-foreground">
        Cuentan los pedidos cobrados; los cancelados no suman.{' '}
        <Link href="/panel/ventas" className="underline">
          Ver ventas de otros días
        </Link>
      </p>
    </>
  );
}

function Dato(props: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{props.titulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{props.valor}</p>
      {props.detalle && (
        <p className="text-xs text-muted-foreground tabular-nums">{props.detalle}</p>
      )}
    </div>
  );
}
