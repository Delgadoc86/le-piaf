'use client';

import { useState } from 'react';
import { AlertTriangle, Layers, Minus, Plus } from 'lucide-react';
import { ROLES_GESTORES } from '@app/shared';
import { useSesion } from '@/features/auth/sesion';
import { ajustarCupoActivo, useCupoActivo } from '@/features/panel/caja';
import { cn } from '@/lib/utils';

interface Props {
  variante?: 'compacto' | 'lateral' | 'tarjeta';
  className?: string;
}

/**
 * Indicador en tiempo real del Cupo del Turno (`local/cupo`).
 * Si el local no usa cupo o la caja está cerrada, no renderiza nada.
 * Los gestores (dueño / encargado) tienen botones rápidos de auxilio (+5, +10, -5).
 */
export function WidgetCupoTurno({ variante = 'compacto', className }: Props) {
  const { cupo } = useCupoActivo();
  const sesion = useSesion();
  const [ajustando, setAjustando] = useState(false);

  if (!cupo) return null;

  const esGestor =
    sesion.estado === 'lista' && sesion.rol !== null && ROLES_GESTORES.includes(sesion.rol);
  const negativo = cupo.restante < 0;
  const agotado = cupo.restante === 0;
  const bajo = cupo.restante > 0 && cupo.restante <= 5;

  async function cambiar(delta: number) {
    if (ajustando) return;
    setAjustando(true);
    try {
      await ajustarCupoActivo(delta);
    } finally {
      setAjustando(false);
    }
  }

  if (variante === 'lateral') {
    return (
      <div
        className={cn(
          'rounded-xl border p-2.5 text-xs space-y-2',
          negativo || agotado
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
            : bajo
              ? 'border-amber-500/30 bg-amber-500/5 text-slate-900 dark:text-slate-100'
              : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            {negativo || agotado ? (
              <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Layers className="size-3.5 text-slate-500 shrink-0" />
            )}
            <span className="truncate">{cupo.nombre}</span>
          </span>
          <span className="font-black tabular-nums text-sm">
            {cupo.restante}{' '}
            <span className="text-[11px] font-semibold opacity-70">/ {cupo.inicial}</span>
          </span>
        </div>
        {(negativo || agotado) && (
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {negativo
              ? `Sobreventa de ${Math.abs(cupo.restante)} u. (web pausada)`
              : 'Cupo agotado en la web'}
          </p>
        )}
        {esGestor && (
          <div className="flex items-center gap-1 pt-0.5">
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(-5)}
              title="Restar 5 unidades al cupo disponible"
              className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              −5
            </button>
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(5)}
              title="Sumar 5 unidades al cupo disponible"
              className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              +5
            </button>
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(10)}
              title="Sumar 10 unidades al cupo disponible"
              className="flex-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-1 font-black text-[11px] hover:bg-emerald-500/20 disabled:opacity-50"
            >
              +10
            </button>
          </div>
        )}
      </div>
    );
  }

  if (variante === 'tarjeta') {
    const vendidos = Math.max(0, cupo.inicial - cupo.restante);
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4 md:p-5 shadow-xs',
          negativo || agotado
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-2xl',
              negativo || agotado
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {negativo || agotado ? (
              <AlertTriangle className="size-5" />
            ) : (
              <Layers className="size-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cupo del turno · {cupo.nombre}
              </span>
              {negativo && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                  Sobreventa ({cupo.restante})
                </span>
              )}
              {agotado && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                  Agotado
                </span>
              )}
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              Quedan {cupo.restante}{' '}
              <span className="text-sm font-semibold text-slate-500">
                de {cupo.inicial} ({vendidos} despachados)
              </span>
            </p>
          </div>
        </div>
        {esGestor && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Auxilio rápido:</span>
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(-5)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <Minus className="size-3" /> 5
            </button>
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(5)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="size-3" /> 5
            </button>
            <button
              type="button"
              disabled={ajustando}
              onClick={() => void cambiar(10)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-3 text-xs font-black hover:bg-emerald-500/25 disabled:opacity-50"
            >
              <Plus className="size-3" /> 10
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs',
        negativo || agotado
          ? 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-200'
          : bajo
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200',
        className,
      )}
    >
      {negativo || agotado ? (
        <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
      ) : (
        <Layers className="size-3.5 text-slate-500 shrink-0" />
      )}
      <span className="font-bold">
        {cupo.nombre}:{' '}
        <strong className="font-black tabular-nums">
          {cupo.restante}/{cupo.inicial}
        </strong>
      </span>
      {esGestor && (
        <span className="inline-flex items-center gap-1 border-l border-current/20 pl-1.5">
          <button
            type="button"
            disabled={ajustando}
            onClick={() => void cambiar(-5)}
            title="Restar 5 al cupo"
            className="rounded px-1.5 py-0.5 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
          >
            −5
          </button>
          <button
            type="button"
            disabled={ajustando}
            onClick={() => void cambiar(5)}
            title="Sumar 5 al cupo"
            className="rounded px-1.5 py-0.5 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
          >
            +5
          </button>
          <button
            type="button"
            disabled={ajustando}
            onClick={() => void cambiar(10)}
            title="Sumar 10 al cupo"
            className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-black text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            +10
          </button>
        </span>
      )}
    </div>
  );
}

