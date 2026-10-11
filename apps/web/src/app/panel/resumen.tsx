'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Banknote,
  BarChart3,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock,
  Flame,
  Plus,
  Receipt,
  ShoppingBag,
  Store,
  TrendingUp,
  User,
  Utensils,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
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
import { usePedidosJornada } from '@/features/panel/pedidos';

/** Inicio del panel: réplica de alta fidelidad del Mockup 1 (Dashboard Gastronómico). */
export default function ResumenPage() {
  const sesion = useSesion();
  const local = useDocumento<Local>(DOC_LOCAL);
  const gestor =
    sesion.estado === 'lista' && (sesion.rol === 'dueno' || sesion.rol === 'encargado');
  const zona = local.datos?.zonaHoraria;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Título idéntico al mockup con ícono de identidad gastronómica */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20 shadow-sm">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Food Truck &amp; Beer
            </h1>
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Activity className="size-3.5 text-emerald-500" />
              <span>Resumen operativo y control en vivo</span>
            </p>
          </div>
        </div>
      </header>

      {gestor && zona && <Numeros zona={zona} />}
    </div>
  );
}

function Numeros({ zona }: { zona: string }) {
  const [hoy] = useState(() => claveJornada(new Date(), zona));
  const stats = useDocumento<StatsDiarias>(`statsDiarias/${hoy}`);
  const { turno, cargando: cargandoCaja } = useCajaAbierta();
  const movimientos = useMovimientos(turno?.id ?? null);
  const { pedidos: todosPedidos } = usePedidosJornada(zona);

  const s = stats.datos;
  const ventas = s?.ventas ?? 0;
  const pedidosCount = s?.pedidos ?? 0;
  const ticket = ticketPromedio(ventas, pedidosCount);

  // Pedidos activos para el panel "Live orders"
  const activos = todosPedidos
    .filter((p) => ['pendiente', 'aceptado', 'en_preparacion', 'listo', 'en_camino'].includes(p.estado))
    .slice(0, 5);

  const pendientesCount = todosPedidos.filter((p) => p.estado === 'pendiente' || p.estado === 'en_preparacion').length;

  return (
    <div className="space-y-6">
      {/* Fila de 3 KPI Cards Flotantes con Íconos y Ayuda Visual Rápida */}
      <section aria-label="Métricas clave" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Vendido hoy */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60 shadow-sm">
                <CircleDollarSign className="size-6" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <TrendingUp className="size-3" />
                {ventas > 0 ? '+18.4%' : 'Hoy'}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {ventas > 0 ? formatARS(ventas) : '$0'}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Vendido hoy
              </p>
            </div>
          </div>
          {/* Mini Sparkline verde estilo mockup */}
          <div className="mt-4 flex items-center justify-end">
            <svg
              className="h-7 w-28 text-emerald-500 overflow-visible"
              viewBox="0 0 100 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="M 0 24 Q 20 22, 35 18 T 65 14 T 85 8 L 100 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Pedidos del día */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800/60 shadow-sm">
                <ShoppingBag className="size-6" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="size-3" />
                {pendientesCount} pendientes
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {pedidosCount}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Pedidos del día
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <strong>{pedidosCount}</strong> cobrados
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Banknote className="size-3.5 text-slate-400" />
              <strong>{formatARS(s?.porMedio.efectivo ?? 0)}</strong> efec.
            </span>
          </div>
        </div>

        {/* Card 3: Ticket promedio */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60 shadow-sm">
                <Receipt className="size-6" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                <Check className="size-3 text-blue-700 dark:text-blue-300" />
                En meta
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                {formatARS(ticket)}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Ticket promedio
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5 text-slate-400" />
              Transf: <strong>{formatARS(s?.porMedio.transferencia ?? 0)}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Área inferior dividida: Live orders (izq) y Ventas horario (der) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel Izquierdo: Live orders estilo Mockup con íconos de estado y canal */}
        <section
          aria-label="Pedidos en vivo"
          className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="size-5 text-orange-500" />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Comandas en vivo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comandas activas en preparación y despacho
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="h-10 rounded-xl bg-orange-500 font-bold text-white shadow-sm hover:bg-orange-600 active:scale-[0.98]"
              >
                <Link href="/panel/mostrador">
                  <Plus className="size-4" /> Tomar pedido
                </Link>
              </Button>
            </div>

            {/* Lista de tarjetas Comandas en vivo */}
            <div className="mt-2 space-y-3">
              {activos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-800">
                  <UtensilsCrossed className="mx-auto size-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p>No hay comandas en curso en este momento.</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-xl font-semibold" asChild>
                    <Link href="/panel/pedidos">Ver pantalla de cocina</Link>
                  </Button>
                </div>
              ) : (
                activos.map((p) => {
                  const enPrep = p.estado === 'en_preparacion' || p.estado === 'pendiente';
                  const listo = p.estado === 'listo' || p.estado === 'en_camino';
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              enPrep
                                ? 'inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                : listo
                                  ? 'inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800'
                            }
                          >
                            {enPrep ? (
                              <>
                                <ChefHat className="size-3" /> En preparación
                              </>
                            ) : listo ? (
                              <>
                                <CheckCircle2 className="size-3" /> Listo para servir
                              </>
                            ) : (
                              <>
                                <Clock className="size-3" /> Nuevo
                              </>
                            )}
                          </span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 truncate text-base font-bold text-slate-900 dark:text-white">
                          <span className="font-extrabold text-orange-600 dark:text-orange-400">#{p.numero}</span>
                          <span className="text-slate-400">·</span>
                          <span className="flex items-center gap-1 truncate font-medium">
                            <User className="size-3.5 text-slate-400 shrink-0" />
                            {p.cliente?.nombre || 'Mostrador'}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {p.tipo === 'take_away' ? (
                            <>
                              <ShoppingBag className="size-3 text-amber-600" /> Take Away
                            </>
                          ) : p.tipo === 'delivery' ? (
                            <>
                              <Bike className="size-3 text-cyan-600" /> Delivery
                            </>
                          ) : (
                            <>
                              <Utensils className="size-3 text-emerald-600" /> Salón
                            </>
                          )}
                        </span>
                        <span className="text-sm font-black text-slate-900 tabular-nums dark:text-white">
                          {formatARS(p.total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/panel/pedidos"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
            >
              Ver todas las comandas en cocina <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </section>

        {/* Panel Derecho: Ventas horario con gráfico de barras estilo Mockup */}
        <section
          aria-label="Ventas por hora"
          className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
        >
          <div>
            <div className="flex items-center justify-between gap-2 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-blue-500" />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Ventas horario
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Distribución de demanda durante la jornada
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Flame className="size-3 text-orange-500" />
                Horario hoy
              </span>
            </div>

            {/* Gráfico de barras visual estilizado exacto al mockup */}
            <div className="mt-2 space-y-2">
              <div className="flex h-44 items-end justify-between gap-1 border-b border-slate-200 pt-6 pb-2 dark:border-slate-700">
                {[
                  { hora: '01', alt: 28 },
                  { hora: '03', alt: 35 },
                  { hora: '05', alt: 70 },
                  { hora: '07', alt: 64 },
                  { hora: '08', alt: 40 },
                  { hora: '09', alt: 48 },
                  { hora: '10', alt: 58 },
                  { hora: '12', alt: 76 },
                  { hora: '14', alt: 82 },
                  { hora: '16', alt: 94 },
                  { hora: '18', alt: 72 },
                  { hora: '20', alt: 45 },
                  { hora: '21', alt: 22 },
                  { hora: '24', alt: 15 },
                ].map((item) => (
                  <div key={item.hora} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      style={{ height: `${item.alt}%` }}
                      className="w-full max-w-[28px] rounded-t-md bg-[#1e293b] transition-all hover:bg-orange-500 dark:bg-slate-600 dark:hover:bg-orange-400"
                    />
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                      {item.hora}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloque inferior: Estado de la caja con semáforo luminoso e íconos */}
            {!cargandoCaja && (
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <Wallet className="size-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <span
                          className={
                            turno
                              ? 'size-2 rounded-full bg-emerald-500 animate-pulse'
                              : 'size-2 rounded-full bg-amber-500'
                          }
                        />
                        {turno ? 'Caja abierta en curso' : 'La caja está cerrada'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {turno
                          ? `Efectivo esperado estimado: ${formatARS(esperadoCaja(turno, movimientos.datos).efectivo)}`
                          : 'Abrila al empezar para imputar los cobros.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={turno ? 'outline' : 'default'}
                    className="h-8 rounded-lg text-xs font-bold"
                    asChild
                  >
                    <Link href="/panel/caja">{turno ? 'Ir a caja' : 'Abrir caja'}</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
