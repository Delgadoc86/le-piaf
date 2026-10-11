'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  Coins,
  History,
  Lock,
  LockOpen,
  Monitor,
  Package,
  Receipt,
  ShoppingBag,
  Truck,
  Wallet,
} from 'lucide-react';
import {
  CATEGORIAS_MOVIMIENTO,
  DOC_LOCAL,
  diferenciaCaja,
  esperadoCaja,
  formatARS,
  type CategoriaMovimiento,
  type Local,
  type PorMedio,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputPesos } from '@/components/panel/ui-panel';
import { useSesion } from '@/features/auth/sesion';
import { mensajeError, useDocumento } from '@/features/panel/firestore';
import {
  abrirCaja,
  anotarMovimiento,
  cerrarCaja,
  ETIQUETA_CATEGORIA,
  useCajaAbierta,
  useCierres,
  useMovimientos,
  type TurnoConId,
} from '@/features/panel/caja';
import { useAlertaPedidosPendientes } from '@/features/panel/pedidos';
import { cn } from '@/lib/utils';

function fechaHora(ts: { toDate(): Date } | null | undefined, zona: string): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts.toDate());
}

const ICONO_CATEGORIA: Record<CategoriaMovimiento, typeof Truck> = {
  proveedor: Truck,
  cambio: Coins,
  retiro: Banknote,
  otro: Package,
};

export default function CajaPage() {
  const pathname = usePathname();
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria ?? 'America/Argentina/Buenos_Aires';
  const { turno, cargando } = useCajaAbierta();
  const pedidosNuevos = useAlertaPedidosPendientes(zona, pathname);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado con estado en vivo */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20 shadow-sm">
            <Wallet className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Caja y Turnos
              </h1>
              {!cargando && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-bold border',
                    turno
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300',
                  )}
                >
                  {turno ? '🟢 Abierta' : '🔴 Cerrada'}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Control de efectivo en cajón, gastos diarios y cierre de turno.
            </p>
          </div>
        </div>
      </header>

      {cargando ? (
        <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-8 text-center text-muted-foreground shadow-sm">
          Cargando estado de la caja…
        </div>
      ) : turno ? (
        <CajaAbierta
          turno={turno}
          zona={zona}
          pedidosNuevosCount={pedidosNuevos}
        />
      ) : (
        <AbrirCaja />
      )}

      <Historial zona={zona} />
    </div>
  );
}

const ATAJOS_CAMBIO = [0, 10000, 20000, 30000, 50000] as const;

function AbrirCaja() {
  const [monto, setMonto] = useState(20000);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setEnviando(true);
    setError(null);
    try {
      await abrirCaja({ montoInicial: monto });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 p-6 md:p-8 shadow-xl space-y-6">
      {/* Alerta visual prominente de Caja Cerrada */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30">
          <Lock className="size-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            La caja está cerrada
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Abrí el turno indicando tu cambio inicial en efectivo para poder registrar cobros y gastos.
          </p>
        </div>
      </div>

      {/* Selector táctil de cambio rápido */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Atajos rápidos de cambio inicial
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ATAJOS_CAMBIO.map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setMonto(valor)}
              className={cn(
                'h-12 md:h-14 rounded-2xl border font-black text-sm md:text-base transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm',
                monto === valor
                  ? 'border-orange-500 bg-orange-500 text-white shadow-orange-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200',
              )}
            >
              {valor === 0 ? 'Sin cambio ($0)' : formatARS(valor)}
            </button>
          ))}
        </div>
      </div>

      {/* Input de monto personalizado */}
      <div className="space-y-2">
        <Label htmlFor="monto-inicial" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          O ingresá otro monto de efectivo
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <InputPesos
              id="monto-inicial"
              valor={monto}
              onCambio={setMonto}
              className="h-14 text-xl font-black pl-8 rounded-2xl"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl font-bold"
              onClick={() => setMonto((m) => m + 5000)}
            >
              + $5.000
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 rounded-xl font-bold"
              onClick={() => setMonto((m) => m + 10000)}
            >
              + $10.000
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl text-xs text-muted-foreground font-semibold"
              onClick={() => setMonto(0)}
            >
              Limpiar ($0)
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {error}
        </div>
      )}

      {/* Botón táctil gigante de apertura */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={() => void abrir()}
          disabled={enviando}
          className="h-14 md:h-16 w-full text-base md:text-lg font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
        >
          <LockOpen className="size-5 shrink-0" />
          <span>{enviando ? 'Abriendo caja…' : `ABRIR TURNO CON ${formatARS(monto)}`}</span>
        </Button>
      </div>
    </section>
  );
}

function CajaAbierta({
  turno,
  zona,
  pedidosNuevosCount,
}: {
  turno: TurnoConId;
  zona: string;
  pedidosNuevosCount: number;
}) {
  const sesion = useSesion();
  const uid = sesion.estado === 'lista' ? sesion.usuario.uid : '';
  const movimientos = useMovimientos(turno.id);
  const [cerrando, setCerrando] = useState(false);

  const esperado = esperadoCaja(turno, movimientos.datos);
  const neto = esperado.efectivo - turno.montoInicial - turno.totales.efectivo;

  return (
    <>
      <div className="space-y-6">
        {/* Cabecera del turno activo */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 md:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">Turno Abierto</span>
                <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-2.5 py-0.5">
                  En actividad
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Desde {fechaHora(turno.abiertoEn, zona)} · Abierto por <strong>{turno.abiertoPorNombre}</strong>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setCerrando(true)}
            className="h-11 rounded-2xl border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/80 dark:text-rose-400 dark:hover:bg-rose-950/40 font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-[0.98]"
          >
            <Lock className="size-4" />
            <span>Cerrar caja</span>
          </Button>
        </section>

        {/* ACCIÓN #1 PRINCIPAL (MÁS USADA): MOSTRADOR. ACCIÓN #2 SECUNDARIA: PEDIDOS WEB */}
        <section aria-label="Operaciones rápidas de pedidos" className="space-y-3">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Botón #1 Principal: Ingresar Pedido Mostrador */}
            <Link
              href="/panel/mostrador"
              className="group relative flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 p-5 text-left text-white shadow-xl shadow-orange-500/25 transition-all hover:brightness-110 active:scale-[0.99] border border-orange-400/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                  <ShoppingBag className="size-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      ⭐ Principal · Más usado
                    </span>
                  </div>
                  <p className="mt-1 text-lg md:text-xl font-black tracking-tight text-white">
                    Ingresar Pedido Mostrador
                  </p>
                  <p className="text-xs font-semibold text-orange-100">
                    Carga rápida de mostrador y cobro al instante
                  </p>
                </div>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white font-bold transition-transform group-hover:translate-x-1">
                ➔
              </span>
            </Link>

            {/* Botón #2 Secundario: Ver Pedidos Web y Cocina */}
            <Link
              href="/panel/pedidos"
              className={cn(
                'group flex items-center justify-between gap-4 rounded-3xl border p-5 text-left transition-all active:scale-[0.99]',
                pedidosNuevosCount > 0
                  ? 'border-orange-500/70 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-white dark:to-slate-900 shadow-lg shadow-orange-500/15'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80 shadow-sm',
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-2xl',
                    pedidosNuevosCount > 0
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  <Monitor className="size-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Secundario
                    </span>
                    {pedidosNuevosCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase text-white animate-pulse">
                        🔔 {pedidosNuevosCount} nuevo{pedidosNuevosCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Ver Pedidos Web y Cocina
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Revisar pedidos online y comandas en preparación
                  </p>
                </div>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600 dark:border-slate-700 dark:group-hover:text-slate-200 font-bold transition-transform group-hover:translate-x-1">
                ➔
              </span>
            </Link>
          </div>
        </section>

        {/* 3 Métricas con Jerarquía Gastronómica */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Tarjeta Hero: Efectivo Físico en Cajón */}
          <div className="sm:col-span-1 rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900 p-5 md:p-6 shadow-md shadow-emerald-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300">
                <Banknote className="size-3.5" />
                EFECTIVO EN CAJÓN
              </span>
            </div>
            <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatARS(esperado.efectivo)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-emerald-500/20">
              <span>Inicial {formatARS(turno.montoInicial)}</span>
              <span>·</span>
              <span>Cobros {formatARS(turno.totales.efectivo)}</span>
              {neto !== 0 && (
                <>
                  <span>·</span>
                  <span className={neto < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                    {neto > 0 ? '+' : '−'} {formatARS(Math.abs(neto))} mov.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Transferencias (Banco / Digital) */}
          <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white dark:to-slate-900 p-5 md:p-6 shadow-md shadow-blue-500/10 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-black text-blue-800 dark:text-blue-300">
              <Building2 className="size-3.5" />
              TRANSFERENCIAS
            </span>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
              {formatARS(turno.totales.transferencia)}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-blue-500/20 pt-1.5">
              Acreditado en banco / MP
            </p>
          </div>

          {/* Tarjeta 3: Pedidos Cobrados */}
          <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 md:p-6 shadow-md space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-300">
              <Receipt className="size-3.5" />
              PEDIDOS COBRADOS
            </span>
            <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {turno.cantidadPedidos}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5">
              En este turno de caja
            </p>
          </div>
        </div>

        {/* Sección de Movimientos de Efectivo */}
        <section className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 md:p-7 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Movimientos de efectivo
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Anotá salidas de dinero (proveedores, hielo, retiros) o ingresos de cambio.
            </p>
          </div>

          <FormMovimiento turnoId={turno.id} uid={uid} />

          {movimientos.datos.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Movimientos registrados en este turno ({movimientos.datos.length})
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
                {movimientos.datos.map((m) => {
                  const IconoCat = ICONO_CATEGORIA[m.categoria] ?? Package;
                  return (
                    <li key={m.id} className="flex items-center gap-3 p-3.5 text-sm transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/50">
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-xl font-black',
                          m.tipo === 'egreso'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {m.tipo === 'egreso' ? (
                          <ArrowUpRight className="size-5" aria-label="Egreso" />
                        ) : (
                          <ArrowDownLeft className="size-5" aria-label="Ingreso" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {ETIQUETA_CATEGORIA[m.categoria]}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            <IconoCat className="size-3" />
                            {m.tipo === 'egreso' ? 'Salida' : 'Entrada'}
                          </span>
                        </div>
                        {m.detalle && (
                          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                            {m.detalle}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                        {fechaHora(m.en, zona)}
                      </span>
                      <span
                        className={cn(
                          'w-28 text-right font-black tabular-nums text-base',
                          m.tipo === 'egreso'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {m.tipo === 'egreso' ? '− ' : '+ '}
                        {formatARS(m.monto)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>

      <DialogoCierre abierto={cerrando} onCerrar={() => setCerrando(false)} esperado={esperado} />
    </>
  );
}

function FormMovimiento({ turnoId, uid }: { turnoId: string; uid: string }) {
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [categoria, setCategoria] = useState<CategoriaMovimiento>('proveedor');
  const [monto, setMonto] = useState(0);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anotar() {
    setEnviando(true);
    setError(null);
    try {
      await anotarMovimiento(turnoId, { tipo, categoria, monto, detalle: detalle.trim() }, uid);
      setMonto(0);
      setDetalle('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Botones grandes de Tipo: Sale plata vs Entra plata */}
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <button
          type="button"
          onClick={() => setTipo('egreso')}
          className={cn(
            'h-12 rounded-2xl border font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs',
            tipo === 'egreso'
              ? 'border-rose-600 bg-rose-600 text-white shadow-rose-600/25'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
          )}
        >
          <ArrowUpRight className="size-4" />
          <span>🔴 Sale plata (Gasto)</span>
        </button>
        <button
          type="button"
          onClick={() => setTipo('ingreso')}
          className={cn(
            'h-12 rounded-2xl border font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs',
            tipo === 'ingreso'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-600/25'
              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
          )}
        >
          <ArrowDownLeft className="size-4" />
          <span>🟢 Entra plata (Aporte)</span>
        </button>
      </div>

      {/* Categorías con iconos gráficos */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS_MOVIMIENTO.map((c) => {
          const Icono = ICONO_CATEGORIA[c];
          const activa = categoria === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              className={cn(
                'h-10 rounded-xl border px-3.5 text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5',
                activa
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
              )}
            >
              <Icono className="size-3.5" />
              <span>{ETIQUETA_CATEGORIA[c]}</span>
            </button>
          );
        })}
      </div>

      {/* Inputs de Monto y Detalle */}
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] items-end">
        <div className="space-y-1.5">
          <Label htmlFor="mov-monto" className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Monto
          </Label>
          <InputPesos
            id="mov-monto"
            valor={monto}
            onCambio={setMonto}
            className="h-12 text-lg font-bold pl-8 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mov-detalle" className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Detalle del gasto / motivo
          </Label>
          <Input
            id="mov-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value.slice(0, 200))}
            placeholder="Ej.: panadería, 2 bolsas de hielo, verdulería…"
            className="h-12 rounded-xl text-sm"
          />
        </div>
        <Button
          onClick={() => void anotar()}
          disabled={monto <= 0 || enviando}
          className="h-12 px-6 rounded-xl font-black text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-950 shadow-md transition-transform active:scale-[0.98]"
        >
          {enviando ? 'Guardando…' : 'Registrar'}
        </Button>
      </div>

      {/* Atajos de suma rápida para el monto */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-muted-foreground mr-1">Sumar:</span>
        {[1000, 2000, 5000, 10000].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setMonto((m) => m + v)}
            className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 transition"
          >
            +{formatARS(v)}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function DialogoCierre({
  abierto,
  onCerrar,
  esperado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  esperado: PorMedio;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6">
        {abierto && <FormCierre esperado={esperado} onListo={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function FormCierre({ esperado, onListo }: { esperado: PorMedio; onListo: () => void }) {
  const [efectivo, setEfectivo] = useState(0);
  const [transferencia, setTransferencia] = useState(esperado.transferencia);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contoEfectivo, setContoEfectivo] = useState(false);
  const dif = diferenciaCaja(esperado, { efectivo, transferencia });

  async function cerrar() {
    setEnviando(true);
    setError(null);
    try {
      await cerrarCaja({
        contado: { efectivo, transferencia },
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      onListo();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600">
            <Lock className="size-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-black">Cerrar turno de caja</DialogTitle>
            <DialogDescription className="text-xs">
              Contá el dinero físico del cajón. Te mostramos el cuadre en vivo.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Efectivo físico contado */}
        <div className="space-y-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="cierre-efectivo" className="text-sm font-bold text-slate-900 dark:text-white">
              Efectivo contado (Billetes en mano)
            </Label>
            <span className="text-xs font-semibold text-slate-500">
              Esperado: <strong>{formatARS(esperado.efectivo)}</strong>
            </span>
          </div>
          <InputPesos
            id="cierre-efectivo"
            valor={efectivo}
            onCambio={(n) => {
              setEfectivo(n);
              setContoEfectivo(true);
            }}
            className="h-14 text-2xl font-black pl-8 rounded-xl bg-white dark:bg-slate-900"
          />

          {/* Semáforo de Cuadre en Vivo */}
          {contoEfectivo && (
            <div className="pt-1">
              <SemaforoCuadre valor={dif.efectivo} />
            </div>
          )}
        </div>

        {/* Transferencias bancarias */}
        <div className="space-y-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <Label htmlFor="cierre-transf" className="text-sm font-bold text-slate-900 dark:text-white">
              Transferencias acreditadas
            </Label>
            <span className="text-xs font-semibold text-slate-500">
              Sistema: <strong>{formatARS(esperado.transferencia)}</strong>
            </span>
          </div>
          <InputPesos
            id="cierre-transf"
            valor={transferencia}
            onCambio={setTransferencia}
            className="h-12 text-lg font-bold pl-8 rounded-xl bg-white dark:bg-slate-900"
          />
          <p className="text-[11px] text-muted-foreground">
            Revisá que coincida con el dinero real en la app del banco o Mercado Pago.
          </p>
        </div>

        {/* Notas del cierre */}
        <div className="space-y-1.5">
          <Label htmlFor="cierre-notas" className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Notas del turno (opcional)
          </Label>
          <Textarea
            id="cierre-notas"
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value.slice(0, 500))}
            placeholder="Ej.: se pagó el flete del fin de semana, faltó un ticket…"
            className="rounded-xl text-sm"
          />
        </div>

        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <Button
          size="lg"
          onClick={() => void cerrar()}
          disabled={enviando || !contoEfectivo}
          className="h-14 w-full text-base font-black bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-600/25 transition-transform active:scale-[0.99]"
        >
          {enviando ? 'Cerrando caja…' : 'CONFIRMAR Y CERRAR TURNO'}
        </Button>
      </DialogFooter>
    </>
  );
}

function SemaforoCuadre({ valor }: { valor: number }) {
  if (valor === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
        <div>
          <p className="font-black text-sm">Cuadre exacto (da justo)</p>
          <p className="text-xs opacity-90">No falta ni sobra un solo peso.</p>
        </div>
      </div>
    );
  }
  if (valor < 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-rose-800 dark:text-rose-300">
        <AlertTriangle className="size-5 text-rose-600 shrink-0" />
        <div>
          <p className="font-black text-sm">Faltante de {formatARS(Math.abs(valor))}</p>
          <p className="text-xs opacity-90">Hay menos billetes en mano de lo esperado.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-amber-800 dark:text-amber-300">
      <Coins className="size-5 text-amber-600 shrink-0" />
      <div>
        <p className="font-black text-sm">Sobrante de {formatARS(valor)}</p>
        <p className="text-xs opacity-90">Hay más dinero físico del registrado.</p>
      </div>
    </div>
  );
}

function Historial({ zona }: { zona: string }) {
  const cierres = useCierres();
  if (cierres.cargando || cierres.datos.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 md:p-7 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <History className="size-5 text-slate-500" />
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Cierres de turnos anteriores
        </h2>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
        {cierres.datos.map((t) => {
          const dif = t.diferencia?.efectivo ?? 0;
          return (
            <li key={t.id} className="space-y-1.5 p-4 text-sm transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-800/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold capitalize text-slate-900 dark:text-white">
                  {fechaHora(t.abiertoEn, zona)} → {fechaHora(t.cerradoEn, zona)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-black shadow-xs',
                    dif === 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : dif < 0
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30',
                  )}
                >
                  {dif === 0
                    ? '✓ Cuadre exacto'
                    : `${dif < 0 ? 'Faltaron' : 'Sobraron'} ${formatARS(Math.abs(dif))}`}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.cantidadPedidos} pedidos · Efectivo contado: <strong>{formatARS(t.contado?.efectivo ?? 0)}</strong> (esperado: {formatARS(t.esperado?.efectivo ?? 0)}) · Transferencias: <strong>{formatARS(t.totales.transferencia)}</strong>
                {t.cerradoPorNombre && ` · Cerró: ${t.cerradoPorNombre}`}
              </p>
              {t.notas && (
                <p className="rounded-lg bg-slate-200/60 dark:bg-slate-800/80 px-2.5 py-1 text-xs italic text-slate-600 dark:text-slate-300">
                  “{t.notas}”
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
