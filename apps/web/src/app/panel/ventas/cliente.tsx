'use client';

import { useState } from 'react';
import {
  claveJornada,
  DOC_LOCAL,
  formatARS,
  sumarDias,
  ticketPromedio,
  type Local,
  type StatsDiarias,
} from '@app/shared';
import { Bloque, EncabezadoPagina } from '@/components/panel/ui-panel';
import { useDocumento } from '@/features/panel/firestore';
import { fechaCorta, useStatsDesde } from '@/features/panel/caja';
import { cn } from '@/lib/utils';

const RANGOS = [
  { dias: 7, texto: '7 días' },
  { dias: 30, texto: '30 días' },
] as const;

export default function VentasPage() {
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria;
  if (!zona) return <p className="text-muted-foreground">Cargando…</p>;
  return <Ventas zona={zona} />;
}

function Ventas({ zona }: { zona: string }) {
  const [dias, setDias] = useState<number>(7);
  // La jornada de hoy se fija al montar: si la página queda abierta después de las 06:00, se recarga.
  const [hoy] = useState(() => claveJornada(new Date(), zona));
  const desde = sumarDias(hoy, -(dias - 1)).fecha;
  const semanaPasada = sumarDias(hoy, -7).fecha;
  const stats = useStatsDesde(desde < semanaPasada ? desde : semanaPasada);

  const porDia = new Map(stats.datos.map((s) => [s.id, s]));
  const vacio: StatsDiarias = {
    jornada: '',
    ventas: 0,
    pedidos: 0,
    porTipo: {},
    porMedio: {},
    porHora: {},
    porProducto: {},
  };
  const deHoy = porDia.get(hoy) ?? vacio;
  const deSemanaPasada = porDia.get(semanaPasada) ?? vacio;

  const jornadas = Array.from({ length: dias }, (_, i) => sumarDias(hoy, -i).fecha);
  const enRango = jornadas.map((j) => porDia.get(j) ?? vacio);
  const total = enRango.reduce(
    (t, s) => ({
      ventas: t.ventas + s.ventas,
      pedidos: t.pedidos + s.pedidos,
      efectivo: t.efectivo + (s.porMedio.efectivo ?? 0),
      transferencia: t.transferencia + (s.porMedio.transferencia ?? 0),
    }),
    { ventas: 0, pedidos: 0, efectivo: 0, transferencia: 0 },
  );
  const maxDia = Math.max(1, ...enRango.map((s) => s.ventas));

  const productos = new Map<string, { nombre: string; cantidad: number; ventas: number }>();
  const horas = new Map<string, number>();
  for (const s of enRango) {
    for (const [id, p] of Object.entries(s.porProducto)) {
      if (p.cantidad <= 0) continue;
      const a = productos.get(id) ?? { nombre: p.nombre, cantidad: 0, ventas: 0 };
      productos.set(id, {
        nombre: p.nombre,
        cantidad: a.cantidad + p.cantidad,
        ventas: a.ventas + p.ventas,
      });
    }
    for (const [h, v] of Object.entries(s.porHora)) horas.set(h, (horas.get(h) ?? 0) + v.pedidos);
  }
  const ranking = [...productos.values()].sort((a, b) => b.ventas - a.ventas).slice(0, 10);
  const maxProducto = Math.max(1, ...ranking.map((p) => p.ventas));
  const horasOrdenadas = [...horas.entries()]
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => orden(a) - orden(b));
  const maxHora = Math.max(1, ...horasOrdenadas.map(([, n]) => n));

  return (
    <div className="max-w-5xl space-y-6">
      <EncabezadoPagina
        titulo="Ventas"
        descripcion="Pedidos cobrados (no cuenta cancelados ni lo que falta cobrar)."
        acciones={
          <div
            className="flex gap-1 rounded-lg bg-muted p-1"
            role="radiogroup"
            aria-label="Período"
          >
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                type="button"
                role="radio"
                aria-checked={dias === r.dias}
                onClick={() => setDias(r.dias)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  dias === r.dias ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground',
                )}
              >
                {r.texto}
              </button>
            ))}
          </div>
        }
      />

      <section aria-label="Hoy" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          titulo="Vendido hoy"
          valor={formatARS(deHoy.ventas)}
          actual={deHoy.ventas}
          antes={deSemanaPasada.ventas}
        />
        <Kpi
          titulo="Pedidos hoy"
          valor={String(deHoy.pedidos)}
          actual={deHoy.pedidos}
          antes={deSemanaPasada.pedidos}
        />
        <Kpi
          titulo="Ticket promedio"
          valor={formatARS(ticketPromedio(deHoy.ventas, deHoy.pedidos))}
          actual={ticketPromedio(deHoy.ventas, deHoy.pedidos)}
          antes={ticketPromedio(deSemanaPasada.ventas, deSemanaPasada.pedidos)}
        />
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Hoy por medio</p>
          <p className="text-sm tabular-nums">Efectivo {formatARS(deHoy.porMedio.efectivo ?? 0)}</p>
          <p className="text-sm tabular-nums">
            Transf. {formatARS(deHoy.porMedio.transferencia ?? 0)}
          </p>
        </div>
      </section>

      <Bloque
        titulo={`Últimos ${dias} días`}
        descripcion={`${formatARS(total.ventas)} en ${total.pedidos} pedidos · ticket ${formatARS(
          ticketPromedio(total.ventas, total.pedidos),
        )} · efectivo ${formatARS(total.efectivo)} · transferencias ${formatARS(total.transferencia)}`}
      >
        {stats.error ? (
          <p className="text-sm text-destructive">{stats.error}</p>
        ) : stats.cargando ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <ul className="space-y-1.5">
            {jornadas.map((j, i) => {
              const s = enRango[i]!;
              return (
                <li key={j} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className={cn('capitalize', j === hoy && 'font-semibold')}>
                    {fechaCorta(j)}
                  </span>
                  <span className="h-5 overflow-hidden rounded bg-muted">
                    <span
                      className="block h-full rounded bg-primary/80"
                      style={{ width: `${(s.ventas / maxDia) * 100}%` }}
                    />
                  </span>
                  <span className="w-32 text-right tabular-nums">
                    {formatARS(s.ventas)}{' '}
                    <span className="text-muted-foreground">· {s.pedidos}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque titulo="Lo más vendido">
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ventas en este período.</p>
          ) : (
            <ol className="space-y-2">
              {ranking.map((p, i) => (
                <li key={p.nombre + i} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span>
                      <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                      {p.nombre}
                    </span>
                    <span className="tabular-nums">
                      {p.cantidad} u · {formatARS(p.ventas)}
                    </span>
                  </div>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded bg-muted">
                    <span
                      className="block h-full bg-primary/70"
                      style={{ width: `${(p.ventas / maxProducto) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Bloque>

        <Bloque titulo="Horarios con más pedidos">
          {horasOrdenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {horasOrdenadas.map(([h, n]) => (
                <div
                  key={h}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${h} h: ${n} pedidos`}
                >
                  <span className="text-[10px] text-muted-foreground tabular-nums">{n}</span>
                  <span
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${(n / maxHora) * 100}px` }}
                  />
                  <span className="text-[10px] tabular-nums">{h}</span>
                </div>
              ))}
            </div>
          )}
        </Bloque>
      </div>
    </div>
  );
}

/** Orden de las horas dentro de la jornada: de 06 a 05 (la madrugada va al final). */
function orden(hora: string): number {
  return (Number(hora) + 18) % 24;
}

function Kpi(props: { titulo: string; valor: string; actual: number; antes: number }) {
  const cambio =
    props.antes > 0 ? Math.round(((props.actual - props.antes) / props.antes) * 100) : null;
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{props.titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{props.valor}</p>
      <p className="text-xs text-muted-foreground">
        {cambio === null ? (
          'Sin datos del mismo día de la semana pasada'
        ) : (
          <>
            <span
              className={cn(
                cambio >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive',
              )}
            >
              {cambio >= 0 ? '▲' : '▼'} {Math.abs(cambio)}%
            </span>{' '}
            vs. semana pasada
          </>
        )}
      </p>
    </div>
  );
}
