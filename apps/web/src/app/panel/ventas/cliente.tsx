'use client';

import { useState } from 'react';
import {
  Banknote,
  Building2,
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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
    <div className="max-w-5xl mx-auto space-y-6">
      <EncabezadoPagina
        titulo="Ventas"
        descripcion="Pedidos cobrados (no cuenta cancelados ni lo que falta cobrar)."
        acciones={
          <div
            className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700"
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
                  'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                  dias === r.dias
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                )}
              >
                {r.texto}
              </button>
            ))}
          </div>
        }
      />

      <section aria-label="Hoy" className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          titulo="Vendido hoy"
          valor={formatARS(deHoy.ventas)}
          actual={deHoy.ventas}
          antes={deSemanaPasada.ventas}
          icono={CircleDollarSign}
          color="emerald"
        />
        <Kpi
          titulo="Pedidos hoy"
          valor={String(deHoy.pedidos)}
          actual={deHoy.pedidos}
          antes={deSemanaPasada.pedidos}
          icono={ShoppingBag}
          color="orange"
        />
        <Kpi
          titulo="Ticket promedio"
          valor={formatARS(ticketPromedio(deHoy.ventas, deHoy.pedidos))}
          actual={ticketPromedio(deHoy.ventas, deHoy.pedidos)}
          antes={ticketPromedio(deSemanaPasada.ventas, deSemanaPasada.pedidos)}
          icono={Receipt}
          color="blue"
        />
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hoy por medio
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Wallet className="size-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                <Banknote className="size-4 text-emerald-500" /> Efectivo
              </span>
              <strong className="font-bold text-slate-900 dark:text-white tabular-nums">
                {formatARS(deHoy.porMedio.efectivo ?? 0)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                <Building2 className="size-4 text-blue-500" /> Transf.
              </span>
              <strong className="font-bold text-slate-900 dark:text-white tabular-nums">
                {formatARS(deHoy.porMedio.transferencia ?? 0)}
              </strong>
            </div>
          </div>
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
          <ul className="space-y-2">
            {jornadas.map((j, i) => {
              const s = enRango[i]!;
              return (
                <li key={j} className="grid grid-cols-[5rem_1fr_auto] items-center gap-3 text-sm">
                  <span className={cn('capitalize font-medium', j === hoy && 'font-black text-orange-600 dark:text-orange-400')}>
                    {fechaCorta(j)}
                  </span>
                  <span className="h-6 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span
                      className="block h-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                      style={{ width: `${(s.ventas / maxDia) * 100}%` }}
                    />
                  </span>
                  <span className="w-36 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                    {formatARS(s.ventas)}{' '}
                    <span className="text-xs font-normal text-slate-400">· {s.pedidos} ped.</span>
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
            <ol className="space-y-3">
              {ranking.map((p, i) => (
                <li key={p.nombre + i} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      <span className="mr-2 text-slate-400 tabular-nums font-bold">{i + 1}.</span>
                      {p.nombre}
                    </span>
                    <span className="tabular-nums font-bold text-slate-900 dark:text-white">
                      {p.cantidad} u · <span className="text-orange-600 dark:text-orange-400">{formatARS(p.ventas)}</span>
                    </span>
                  </div>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span
                      className="block h-full rounded-full bg-orange-500 transition-all duration-300"
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
            <div className="flex h-44 items-end gap-1.5 pt-4">
              {horasOrdenadas.map(([h, n]) => (
                <div
                  key={h}
                  className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end"
                  title={`${h} h: ${n} pedidos`}
                >
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">{n}</span>
                  <span
                    className="w-full max-w-[24px] rounded-t-lg bg-slate-800 hover:bg-orange-500 dark:bg-slate-700 dark:hover:bg-orange-400 transition-colors"
                    style={{ height: `${(n / maxHora) * 100}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">{h}</span>
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

function Kpi(props: {
  titulo: string;
  valor: string;
  actual: number;
  antes: number;
  icono: typeof CircleDollarSign;
  color: 'emerald' | 'orange' | 'blue';
}) {
  const Icono = props.icono;
  const cambio =
    props.antes > 0 ? Math.round(((props.actual - props.antes) / props.antes) * 100) : null;

  const colorStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  }[props.color];

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {props.titulo}
          </span>
          <div className={cn('flex size-9 items-center justify-center rounded-xl', colorStyles)}>
            <Icono className="size-5" />
          </div>
        </div>
        <p className="mt-2 text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
          {props.valor}
        </p>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
        {cambio === null ? (
          'Sin datos del mismo día anterior'
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold">
            {cambio >= 0 ? (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <TrendingUp className="mr-0.5 size-3.5" /> +{cambio}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-bold">
                <TrendingDown className="mr-0.5 size-3.5" /> {cambio}%
              </span>
            )}{' '}
            vs. semana pasada
          </span>
        )}
      </p>
    </div>
  );
}
