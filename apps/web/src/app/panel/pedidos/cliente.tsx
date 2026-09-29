'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, ChevronDown, Monitor, Plus, X } from 'lucide-react';
import {
  DOC_LOCAL,
  formatARS,
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
import { NuevoPedido } from '@/components/panel/pedidos/nuevo-pedido';
import { useSesion } from '@/features/auth/sesion';
import { useCajaAbierta } from '@/features/panel/caja';
import { mensajeError, useDocumento } from '@/features/panel/firestore';
import {
  anularCobros,
  cambiarDemora,
  cambiarEstado,
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

export default function PedidosPage() {
  const sesion = useSesion();
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria;
  const { pedidos, cargando, error } = usePedidosJornada(zona);
  const ahora = useAhora();

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cobroId, setCobroId] = useState<string | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [pestana, setPestana] = useState<IdEtapa>('nuevos');
  const [verTerminados, setVerTerminados] = useState(false);
  // El panel se renderiza solo en el navegador: se puede leer localStorage al iniciar el estado.
  const [verTip, setVerTip] = useState(() => leerLocal(CLAVE_TIP_PANTALLA) !== '1');
  // Si el sonido estaba activado, el navegador igual pide un toque para habilitarlo.
  const [sonido, setSonido] = useState<'apagado' | 'bloqueado' | 'activo'>(() =>
    sonidoGuardado() ? 'bloqueado' : 'apagado',
  );

  const uid = sesion.estado === 'lista' ? sesion.usuario.uid : '';
  const rol = sesion.estado === 'lista' ? sesion.rol : null;
  const esGestor = rol === 'dueno' || rol === 'encargado';
  const caja = useCajaAbierta();
  const detalle = pedidos.find((p) => p.id === detalleId) ?? null;
  const aCobrar = pedidos.find((p) => p.id === cobroId) ?? null;
  const nuevos = pedidos.filter((p) => p.estado === 'pendiente');
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
    />
  );
  const terminados = pedidos.filter((p) => TERMINADOS.includes(p.estado));
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
    <div className="space-y-4">
      {/* Encabezado compacto: título, totales del día y acciones */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            Hoy: {totales.pedidos} {totales.pedidos === 1 ? 'pedido' : 'pedidos'} · 💵{' '}
            {formatARS(totales.porMedio.efectivo)} · 🏦 {formatARS(totales.porMedio.transferencia)}
            {totales.porCobrar > 0 && (
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {' '}
                · Por cobrar {formatARS(totales.porCobrar)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sonido === 'activo' ? 'outline' : 'default'}
            className={cn(
              sonido !== 'activo' && 'animate-pulse bg-amber-400 text-amber-950 hover:bg-amber-500',
            )}
            onClick={() => void alternarSonido()}
            aria-pressed={sonido === 'activo'}
            title={sonido === 'activo' ? 'Tocá para silenciar' : undefined}
          >
            {sonido === 'activo' ? <Bell /> : <BellRing />}
            {sonido === 'activo' ? (
              'Sonido activado'
            ) : (
              <>
                Activar sonido<span className="hidden sm:inline"> de pedidos</span>
              </>
            )}
          </Button>
          <Button size="lg" onClick={() => setNuevoAbierto(true)}>
            <Plus /> Nuevo pedido
          </Button>
        </div>
      </header>

      {/* Avisos: lo urgente arriba de todo */}
      {nuevos.length > 0 && (
        <button
          type="button"
          onClick={() => setPestana('nuevos')}
          className="flex w-full items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-left text-sm font-semibold text-amber-950 shadow-sm md:px-4 md:py-3 md:text-base"
        >
          <BellRing className="size-5 shrink-0 animate-bounce" aria-hidden />
          {nuevos.length === 1
            ? 'Entró 1 pedido nuevo: aceptalo para que el cliente vea que lo están preparando.'
            : `Hay ${nuevos.length} pedidos nuevos esperando que los aceptes.`}
        </button>
      )}
      {esGestor && !caja.cargando && !caja.turno && (
        <p className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm md:py-2">
          <span>
            La caja está cerrada
            <span className="hidden sm:inline">: lo que cobres no va a sumar a ninguna caja</span>.
          </span>
          <Link href="/panel/caja" className="font-semibold underline">
            Abrir caja
          </Link>
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {verTip && (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm md:hidden">
          <Monitor className="mt-0.5 size-4 shrink-0" aria-hidden />
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
        className="sticky top-0 z-10 -mx-4 flex gap-1 bg-background/95 px-4 py-2 backdrop-blur md:hidden"
        role="tablist"
      >
        {ETAPAS.map((e) => {
          const n = porEtapa[e.id].length;
          const activa = pestana === e.id;
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setPestana(e.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm whitespace-nowrap',
                activa
                  ? cn(COLOR_ETAPA[e.id].encabezado, 'border-transparent font-semibold')
                  : 'bg-card',
              )}
            >
              {e.corto}
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-xs font-bold tabular-nums',
                  activa
                    ? 'bg-black/15'
                    : n > 0
                      ? cn(COLOR_ETAPA[e.id].punto, 'text-white')
                      : 'bg-muted',
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-3 md:grid-cols-3">
        {ETAPAS.map((e) => {
          const lista = porEtapa[e.id];
          const color = COLOR_ETAPA[e.id];
          return (
            <section
              key={e.id}
              aria-label={e.titulo}
              className={cn(
                'min-w-0 rounded-2xl p-2',
                color.fondo,
                pestana !== e.id && 'hidden md:block',
              )}
            >
              <h2
                className={cn(
                  'mb-2 hidden items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold md:flex',
                  color.encabezado,
                )}
              >
                {e.titulo}
                <span className="rounded-full bg-black/15 px-2 text-xs tabular-nums">
                  {lista.length}
                </span>
              </h2>
              <div className="space-y-2">
                {lista.length === 0 ? (
                  <p className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
                    {e.vacio}
                  </p>
                ) : (
                  lista.map(tarjeta)
                )}
              </div>
            </section>
          );
        })}
      </div>

      {terminados.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setVerTerminados((v) => !v)}
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
            aria-expanded={verTerminados}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', verTerminados && 'rotate-180')}
            />
            Entregados y cancelados de hoy ({terminados.length})
          </button>
          {verTerminados && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        onAnularCobros={() =>
          detalle &&
          void ejecutar(detalle.id, () => anularCobros(detalle), { texto: 'Cobro deshecho' })
        }
      />
      <DialogoCobro
        pedido={aCobrar}
        onCerrar={() => setCobroId(null)}
        onConfirmar={async (cobro) => {
          if (!aCobrar) return;
          await ejecutar(aCobrar.id, () => registrarCobro(aCobrar, cobro, uid), {
            texto: `Cobro de ${formatARS(cobro.monto)} registrado en el #${aCobrar.numero}`,
          });
          setCobroId(null);
        }}
      />
      <NuevoPedido
        abierto={nuevoAbierto}
        tipos={local.datos?.pedidos.tipos ?? { takeAway: true, delivery: false, salon: false }}
        onCerrar={() => setNuevoAbierto(false)}
        onCreado={(numero) => {
          setNuevoAbierto(false);
          setPestana('preparacion');
          setAviso({ tipo: 'ok', texto: `Pedido #${numero} cargado: está en preparación` });
        }}
      />
    </div>
  );
}
