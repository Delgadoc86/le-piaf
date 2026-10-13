'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Archive,
  BellRing,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Monitor,
  Plus,
  ShoppingBag,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import {
  DOC_LOCAL,
  formatARS,
  configConfirmacion,
  resumenCaja,
  siguienteEstado,
  totalCobrado,
  type EstadoPedido,
  type Local,
  type MedioPagoManual,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { TarjetaPedido } from '@/components/panel/pedidos/tarjeta-pedido';
import { DetallePedido } from '@/components/panel/pedidos/detalle-pedido';
import { DialogoCobro } from '@/components/panel/pedidos/dialogo-cobro';
import { useSesion } from '@/features/auth/sesion';
import { useCajaAbierta } from '@/features/panel/caja';
import { mensajeError, useDocumento } from '@/features/panel/firestore';
import {
  anularCobros,
  cambiarDemora,
  cambiarEnvio,
  bloquearNumero,
  cambiarEstado,
  confirmarPedido,
  COLOR_ETAPA,
  ETAPAS,
  puedeOperar,
  registrarCobro,
  useAhora,
  usePedidosJornada,
  type IdEtapa,
  type PedidoConId,
} from '@/features/panel/pedidos';
import {
  guardarSonido,
  habilitarSonido,
  sonarPedidoNuevo,
  sonidoGuardado,
  sonidoHabilitado,
} from '@/features/panel/sonido';
import { cn } from '@/lib/utils';

const TERMINADOS: readonly EstadoPedido[] = ['entregado', 'cancelado', 'rechazado'];
const CLAVE_TIP_PANTALLA = 'panel-tip-pantalla-v1';

interface Aviso {
  tipo: 'ok' | 'error';
  texto: string;
  deshacer?: () => void;
}

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

const ICONO_ETAPA: Record<IdEtapa, typeof BellRing> = {
  nuevos: BellRing,
  preparacion: ChefHat,
  listos: CheckCircle2,
};

export default function PedidosPage() {
  const sesion = useSesion();
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria;
  const { pedidos, cargando, error, cancelacion } = usePedidosJornada(zona);
  const ahora = useAhora();

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cobroId, setCobroId] = useState<string | null>(null);
  // El cobro se abrió al tocar "Entregado": al confirmar, se cobra y se entrega.
  const [entregando, setEntregando] = useState(false);
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [pestana, setPestana] = useState<IdEtapa>('nuevos');
  const [verTerminados, setVerTerminados] = useState(false);
  // El panel se renderiza solo en el navegador: se puede leer localStorage al iniciar el estado.
  const [verTip, setVerTip] = useState(() => leerLocal(CLAVE_TIP_PANTALLA) !== '1');
  // Sonido activado por defecto: si el navegador lo tiene listo queda activo, sino se activa al primer click
  const [sonido, setSonido] = useState<'apagado' | 'bloqueado' | 'activo'>(() =>
    sonidoGuardado() ? (sonidoHabilitado() ? 'activo' : 'bloqueado') : 'apagado',
  );

  useEffect(() => {
    if (!sonidoGuardado() || sonidoHabilitado()) return;

    const desbloquear = () => {
      if (sonidoHabilitado()) setSonido('activo');
    };
    window.addEventListener('click', desbloquear, { once: true, passive: true });
    window.addEventListener('touchstart', desbloquear, { once: true, passive: true });
    return () => {
      window.removeEventListener('click', desbloquear);
      window.removeEventListener('touchstart', desbloquear);
    };
  }, []);

  const uid = sesion.estado === 'lista' ? sesion.usuario.uid : '';
  const rol = sesion.estado === 'lista' ? sesion.rol : null;
  const esGestor = rol === 'dueno' || rol === 'encargado';
  const caja = useCajaAbierta();
  const detalle = pedidos.find((p) => p.id === detalleId) ?? null;
  const aCobrar = pedidos.find((p) => p.id === cobroId) ?? null;
  const nuevos = pedidos.filter((p) => p.estado === 'pendiente');
  const porAceptar = nuevos.filter((p) => !p.porConfirmar);
  const sinConfirmar = nuevos.length - porAceptar.length;
  const confirmacion = configConfirmacion(local.datos?.pedidos ?? {});

  // Aviso cuando un pedido nuevo se cancela solo (vencido) o lo cancela el cliente.
  const [cancelacionVista, setCancelacionVista] = useState<string | null>(null);
  const cancelacionActiva = cancelacion && cancelacion.id !== cancelacionVista ? cancelacion : null;
  const totales = resumenCaja(pedidos);

  // Pedido nuevo: sonido + contador en la pestaña del navegador.
  const vistos = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (cargando) return;
    const ids = new Set(nuevos.map((p) => p.id));
    if (vistos.current && [...ids].some((id) => !vistos.current!.has(id)) && sonido === 'activo') {
      sonarPedidoNuevo();
    }
    vistos.current = new Set([...(vistos.current ?? []), ...ids]);
  }, [nuevos, cargando, sonido]);
  useEffect(() => {
    const original = document.title;
    if (nuevos.length > 0) document.title = `(${nuevos.length}) Pedidos nuevos`;
    return () => {
      document.title = original;
    };
  }, [nuevos.length]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.deshacer ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function alternarSonido() {
    if (sonido === 'activo') {
      setSonido('apagado');
      guardarSonido(false);
      return;
    }
    const ok = await habilitarSonido();
    setSonido(ok ? 'activo' : 'bloqueado');
    guardarSonido(ok);
    if (ok) sonarPedidoNuevo();
  }

  async function ejecutar(id: string, accion: () => Promise<unknown>, exito?: Omit<Aviso, 'tipo'>) {
    setOcupados((s) => new Set(s).add(id));
    try {
      await accion();
      if (exito) setAviso({ tipo: 'ok', ...exito });
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e) });
    } finally {
      setOcupados((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  function avanzar(p: PedidoConId, estado: EstadoPedido, motivo?: string) {
    // No se entrega sin dejar asentado el pago: primero se pregunta cómo pagó.
    if (estado === 'entregado' && totalCobrado(p.pagos) < p.total) {
      setDetalleId(null);
      setEntregando(true);
      setCobroId(p.id);
      return;
    }
    void ejecutar(p.id, () =>
      cambiarEstado(p, estado, uid, motivo ? { motivoCancelacion: motivo } : {}),
    );
  }

  function cobrarRapido(p: PedidoConId, medio: MedioPagoManual) {
    const monto = Math.max(0, p.total - totalCobrado(p.pagos));
    if (monto <= 0) return;
    void ejecutar(p.id, () => registrarCobro(p, { medio, monto }, uid), {
      texto: `#${p.numero} cobrado: ${formatARS(monto)} en ${medio}`,
      deshacer: () => {
        setAviso(null);
        void ejecutar(p.id, () => anularCobros(p), { texto: `Cobro del #${p.numero} deshecho` });
      },
    });
  }

  if (!zona || cargando) {
    return <p className="text-muted-foreground">Cargando pedidos…</p>;
  }

  const tarjeta = (p: PedidoConId) => (
    <TarjetaPedido
      key={p.id}
      pedido={p}
      zonaHoraria={zona}
      ahora={ahora}
      operable={puedeOperar(p, rol, uid)}
      ocupado={ocupados.has(p.id)}
      onAbrir={() => setDetalleId(p.id)}
      onAvanzar={() => {
        const siguiente = siguienteEstado(p.estado, p.tipo);
        if (siguiente) avanzar(p, siguiente);
      }}
      onCobrarRapido={(m) => cobrarRapido(p, m)}
      onCobrarOtro={() => setCobroId(p.id)}
      onConfirmar={() =>
        void ejecutar(p.id, () => confirmarPedido(p), {
          texto: `#${p.numero} confirmado: ya lo podés aceptar`,
        })
      }
      aceptarSinConfirmar={confirmacion.aceptarSinConfirmar}
    />
  );
  const terminados = pedidos.filter((p) => TERMINADOS.includes(p.estado));
  const sinCobrar = terminados.filter(
    (p) => p.estado === 'entregado' && p.estadoPago !== 'pagado',
  ).length;
  const porEtapa = Object.fromEntries(
    ETAPAS.map((e) => [
      e.id,
      pedidos
        .filter((p) => e.estados.includes(p.estado))
        // Lo más viejo primero: es lo que hay que sacar antes.
        .sort((a, b) => (a.creadoEn?.toMillis() ?? 0) - (b.creadoEn?.toMillis() ?? 0)),
    ]),
  ) as Record<IdEtapa, PedidoConId[]>;

  return (
    <div className="max-w-6xl mx-auto rounded-3xl bg-white border border-slate-200/90 p-4 md:p-6 shadow-sm space-y-5 text-slate-900">
      {/* Encabezado gastronómico en lenguaje del local */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 shadow-sm">
            <ChefHat className="size-6 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">Pantalla de Cocina</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">
                Comandas en vivo
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Activity className="size-3 text-emerald-500" />
              <span>Control de despacho y cocina en tiempo real</span>
            </p>
          </div>
        </div>

        {/* Métrica de pedidos y ventas del día con iconos */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-2 text-xs md:text-sm text-slate-600">
          <span className="text-slate-500">Hoy:</span>
          <span className="inline-flex items-center gap-1 font-black text-slate-900 tabular-nums">
            <ShoppingBag className="size-3.5 text-slate-400" />
            {totales.pedidos} pedidos
          </span>
          <span className="text-slate-300">·</span>
          <span className="inline-flex items-center gap-1 font-black text-emerald-600 tabular-nums">
            <CircleDollarSign className="size-3.5 text-emerald-600" />
            {formatARS(totales.vendido)}
          </span>
          {totales.porCobrar > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 font-bold text-amber-900 text-xs">
              <Coins className="size-3 text-amber-700" />
              Por cobrar {formatARS(totales.porCobrar)}
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className={cn(
              'h-11 rounded-xl font-bold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2 shadow-xs',
              sonido === 'activo'
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50/70'
                : 'animate-pulse bg-amber-500 text-slate-950 hover:bg-amber-400 border-none',
            )}
            onClick={() => void alternarSonido()}
            aria-pressed={sonido === 'activo'}
            title={sonido === 'activo' ? 'Tocá para silenciar el timbre' : undefined}
          >
            {sonido === 'activo' ? (
              <>
                <Volume2 className="size-4 text-emerald-600" />
                <span>Timbre ON</span>
              </>
            ) : (
              <>
                <VolumeX className="size-4" />
                <span>Activar timbre</span>
              </>
            )}
          </Button>
          <Link href="/panel/mostrador">
            <Button
              size="lg"
              className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-md shadow-orange-500/20 transition-transform active:scale-[0.98] flex items-center gap-1.5"
            >
              <Plus className="size-4" /> Cargar en Mostrador
            </Button>
          </Link>
        </div>
      </header>

      {/* Avisos: lo urgente arriba de todo */}
      {porAceptar.length > 0 && (
        <button
          type="button"
          onClick={() => setPestana('nuevos')}
          className="flex w-full items-center gap-3 rounded-2xl bg-amber-500 px-4 py-3 text-left font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 md:text-base animate-pulse"
        >
          <BellRing className="size-5 shrink-0 animate-bounce" aria-hidden />
          <span className="flex-1">
            {porAceptar.length === 1
              ? '🔔 ¡Entró 1 pedido nuevo! Aceptalo para empezar a cocinar.'
              : `🔔 ¡Hay ${porAceptar.length} pedidos nuevos esperando para entrar a cocinar!`}
          </span>
          <span className="rounded-lg bg-black/20 px-3 py-1 text-xs uppercase tracking-wider font-extrabold">
            Ver ahora →
          </span>
        </button>
      )}
      {cancelacionActiva && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-900 shadow-xs"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span>
              {cancelacionActiva.por === 'cliente'
                ? `El cliente canceló el pedido #${cancelacionActiva.numero}.`
                : `Se canceló el #${cancelacionActiva.numero}: el cliente no lo confirmó a tiempo.`}
            </span>
          </span>
          <button
            type="button"
            className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
            onClick={() => setCancelacionVista(cancelacionActiva.id)}
          >
            Entendido
          </button>
        </div>
      )}
      {sinConfirmar > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-4 py-2.5 text-sm font-medium text-amber-900">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span>
            ⏳ {sinConfirmar === 1 ? '1 pedido espera' : `${sinConfirmar} pedidos esperan`} que el
            cliente lo confirme por WhatsApp. Si no confirma, se cancela solo.
          </span>
        </p>
      )}
      {esGestor && !caja.cargando && !caja.turno && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-2.5 text-sm font-medium text-amber-950">
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-amber-600 shrink-0" />
            <span>La caja está cerrada: lo que cobres no va a sumar a ningún turno de caja.</span>
          </span>
          <Link href="/panel/caja" className="font-bold underline text-amber-800 hover:text-amber-950">
            Abrir caja
          </Link>
        </div>
      )}
      {error && (
        <p className="rounded-2xl bg-destructive/10 border border-destructive/30 p-3 text-sm font-medium text-destructive">{error}</p>
      )}
      {verTip && (
        <p className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:hidden">
          <Monitor className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
          <span className="flex-1">
            Para el servicio conviene una <strong>compu o tablet</strong>: ves las 3 columnas
            juntas. En el celular, usá las pestañas.
          </span>
          <button
            type="button"
            aria-label="Cerrar sugerencia"
            onClick={() => {
              setVerTip(false);
              try {
                localStorage.setItem(CLAVE_TIP_PANTALLA, '1');
              } catch {
                // sin almacenamiento: vuelve a aparecer la próxima vez
              }
            }}
          >
            <X className="size-4" />
          </button>
        </p>
      )}

      {/* Celular: pestañas fijas con contador de color; tablet y compu: columnas */}
      <div
        className="sticky top-0 z-10 -mx-4 flex gap-1.5 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden border-b border-slate-200"
        role="tablist"
      >
        {ETAPAS.map((e) => {
          const n = porEtapa[e.id].length;
          const activa = pestana === e.id;
          const IconoEtapa = ICONO_ETAPA[e.id];
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setPestana(e.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition',
                activa
                  ? cn(COLOR_ETAPA[e.id].encabezado, 'border-transparent shadow-md')
                  : 'bg-slate-50 text-slate-600 border-slate-200',
              )}
            >
              <IconoEtapa className="size-3.5 shrink-0" />
              <span>{e.corto}</span>
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 py-0.5 text-xs font-black tabular-nums',
                  activa
                    ? 'bg-black/20 text-white'
                    : n > 0
                      ? cn(COLOR_ETAPA[e.id].punto, 'text-white')
                      : 'bg-slate-200 text-slate-600',
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 md:grid-cols-3">
        {ETAPAS.map((e) => {
          const lista = porEtapa[e.id];
          const color = COLOR_ETAPA[e.id];
          const totalColumna = lista.reduce((acc, p) => acc + p.total, 0);
          const IconoEtapa = ICONO_ETAPA[e.id];

          return (
            <section
              key={e.id}
              aria-label={e.titulo}
              className={cn(
                'min-w-0 rounded-2xl p-2.5 md:p-3 bg-slate-100/70 border border-slate-200 shadow-xs transition-colors',
                pestana !== e.id && 'hidden md:block',
              )}
            >
              <div
                className={cn(
                  'mb-3 hidden items-center justify-between rounded-xl px-4 py-3 shadow-sm md:flex',
                  color.encabezado,
                )}
              >
                <div className="flex items-center gap-2">
                  <IconoEtapa className="size-4 shrink-0" />
                  <h2 className="text-xs font-black uppercase tracking-wider">{e.titulo}</h2>
                  <span className="flex size-6 items-center justify-center rounded-full bg-black/20 text-xs font-black tabular-nums">
                    {lista.length}
                  </span>
                </div>
                {lista.length > 0 && (
                  <span className="text-xs font-black tabular-nums opacity-95">
                    {formatARS(totalColumna)}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {lista.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm font-medium text-slate-500">
                    <IconoEtapa className="mx-auto size-7 text-slate-400 mb-2" />
                    <p>{e.vacio}</p>
                  </div>
                ) : (
                  lista.map(tarjeta)
                )}
              </div>
            </section>
          );
        })}
      </div>

      {terminados.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setVerTerminados((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition"
            aria-expanded={verTerminados}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', verTerminados && 'rotate-180')}
            />
            <Archive className="size-4 text-slate-500" />
            <span>Entregados y cancelados de hoy ({terminados.length})</span>
            {sinCobrar > 0 && (
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                {sinCobrar} sin cobrar
              </span>
            )}
          </button>
          {verTerminados && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {terminados.map(tarjeta)}
            </div>
          )}
        </section>
      )}

      {/* Aviso flotante (con "Deshacer" después de cobrar) */}
      {aviso && (
        <div
          role="status"
          className={cn(
            'fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
            aviso.tipo === 'ok' ? 'bg-foreground text-background' : 'bg-destructive text-white',
          )}
        >
          <span className="flex-1">{aviso.texto}</span>
          {aviso.deshacer && (
            <button type="button" onClick={aviso.deshacer} className="font-bold underline">
              Deshacer
            </button>
          )}
        </div>
      )}

      <DetallePedido
        pedido={detalle}
        zonaHoraria={zona}
        nombreLocal={local.datos?.nombreCorto ?? ''}
        operable={detalle ? puedeOperar(detalle, rol, uid) : false}
        ocupado={detalle ? ocupados.has(detalle.id) : false}
        onCerrar={() => setDetalleId(null)}
        onEstado={(estado, motivo) => detalle && avanzar(detalle, estado, motivo)}
        onDemora={(min) => detalle && void ejecutar(detalle.id, () => cambiarDemora(detalle, min))}
        onCobrar={() => detalle && setCobroId(detalle.id)}
        onConfirmar={() =>
          detalle &&
          void ejecutar(detalle.id, () => confirmarPedido(detalle), {
            texto: `#${detalle.numero} confirmado: ya lo podés aceptar`,
          })
        }
        onBloquear={(motivo) => {
          const tel = detalle?.cliente?.telefono;
          if (!detalle || !tel) return;
          void ejecutar(
            detalle.id,
            async () => {
              await bloquearNumero(tel, motivo, uid);
              if (detalle.estado === 'pendiente') {
                await cambiarEstado(detalle, 'cancelado', uid, {
                  motivoCancelacion: 'No pudimos tomar tu pedido',
                });
              }
            },
            { texto: `+${tel} bloqueado: ya no puede pedir por la web` },
          );
        }}
        puedeBloquear={esGestor}
        aceptarSinConfirmar={confirmacion.aceptarSinConfirmar}
        onEnvio={(costo) =>
          detalle &&
          void ejecutar(detalle.id, () => cambiarEnvio(detalle, costo), {
            texto: `Envío del #${detalle.numero}: ${formatARS(costo)}. Avisale al cliente por WhatsApp.`,
          })
        }
        onAnularCobros={() =>
          detalle &&
          void ejecutar(detalle.id, () => anularCobros(detalle), { texto: 'Cobro deshecho' })
        }
      />
      <DialogoCobro
        pedido={aCobrar}
        entregar={entregando}
        onCerrar={() => {
          setCobroId(null);
          setEntregando(false);
        }}
        onConfirmar={async (cobro) => {
          if (!aCobrar) return;
          const p = aCobrar;
          const conEntrega = entregando;
          await ejecutar(
            p.id,
            async () => {
              await registrarCobro(p, cobro, uid);
              if (conEntrega) await cambiarEstado(p, 'entregado', uid);
            },
            {
              texto: conEntrega
                ? `#${p.numero} entregado y cobrado: ${formatARS(cobro.monto)} en ${cobro.medio}`
                : `Cobro de ${formatARS(cobro.monto)} registrado en el #${p.numero}`,
            },
          );
          setCobroId(null);
          setEntregando(false);
        }}
        onEntregarSinCobrar={() => {
          if (!aCobrar) return;
          const p = aCobrar;
          setCobroId(null);
          setEntregando(false);
          void ejecutar(p.id, () => cambiarEstado(p, 'entregado', uid), {
            texto: `#${p.numero} entregado sin cobrar: queda en "Por cobrar"`,
          });
        }}
      />
    </div>
  );
}
