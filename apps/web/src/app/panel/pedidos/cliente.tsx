'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, ChevronDown, Plus } from 'lucide-react';
import {
  DOC_LOCAL,
  formatARS,
  resumenCaja,
  siguienteEstado,
  type EstadoPedido,
  type Local,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { EncabezadoPagina } from '@/components/panel/ui-panel';
import { TarjetaPedido } from '@/components/panel/pedidos/tarjeta-pedido';
import { DetallePedido } from '@/components/panel/pedidos/detalle-pedido';
import { DialogoCobro } from '@/components/panel/pedidos/dialogo-cobro';
import { NuevoPedido } from '@/components/panel/pedidos/nuevo-pedido';
import { useSesion } from '@/features/auth/sesion';
import { mensajeError, useDocumento } from '@/features/panel/firestore';
import {
  anularCobros,
  cambiarDemora,
  cambiarEstado,
  puedeOperar,
  registrarCobro,
  usePedidosJornada,
  type PedidoConId,
} from '@/features/panel/pedidos';
import {
  guardarSonido,
  habilitarSonido,
  sonarPedidoNuevo,
  sonidoGuardado,
} from '@/features/panel/sonido';
import { cn } from '@/lib/utils';

const COLUMNAS: { id: string; titulo: string; estados: readonly EstadoPedido[] }[] = [
  { id: 'nuevos', titulo: 'Nuevos', estados: ['pendiente', 'aceptado'] },
  { id: 'preparacion', titulo: 'En preparación', estados: ['en_preparacion'] },
  { id: 'listos', titulo: 'Listos / en camino', estados: ['listo', 'en_camino'] },
];
const TERMINADOS: readonly EstadoPedido[] = ['entregado', 'cancelado', 'rechazado'];

export default function PedidosPage() {
  const sesion = useSesion();
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria;
  const { pedidos, cargando, error } = usePedidosJornada(zona);

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cobroId, setCobroId] = useState<string | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pestana, setPestana] = useState('nuevos');
  const [verTerminados, setVerTerminados] = useState(false);
  // Si el sonido estaba activado, el navegador igual pide un toque para habilitarlo (el panel
  // se renderiza solo en el navegador, así que se puede leer localStorage acá).
  const [sonido, setSonido] = useState<'apagado' | 'bloqueado' | 'activo'>(() =>
    sonidoGuardado() ? 'bloqueado' : 'apagado',
  );

  const uid = sesion.estado === 'lista' ? sesion.usuario.uid : '';
  const rol = sesion.estado === 'lista' ? sesion.rol : null;
  const detalle = pedidos.find((p) => p.id === detalleId) ?? null;
  const aCobrar = pedidos.find((p) => p.id === cobroId) ?? null;
  const nuevos = pedidos.filter((p) => p.estado === 'pendiente');
  const caja = resumenCaja(pedidos);

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
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function activarSonido() {
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

  async function ejecutar(id: string, accion: () => Promise<unknown>, exito?: string) {
    setOcupados((s) => new Set(s).add(id));
    try {
      await accion();
      if (exito) setAviso({ tipo: 'ok', texto: exito });
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

  if (!zona || cargando) {
    return <p className="text-muted-foreground">Cargando pedidos…</p>;
  }

  const tarjeta = (p: PedidoConId) => (
    <TarjetaPedido
      key={p.id}
      pedido={p}
      zonaHoraria={zona}
      operable={puedeOperar(p, rol, uid)}
      ocupado={ocupados.has(p.id)}
      onAbrir={() => setDetalleId(p.id)}
      onAvanzar={() => {
        const siguiente = siguienteEstado(p.estado, p.tipo);
        if (siguiente) avanzar(p, siguiente);
      }}
      onCobrar={() => setCobroId(p.id)}
    />
  );
  const terminados = pedidos.filter((p) => TERMINADOS.includes(p.estado));

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Los pedidos del día, en vivo. Tocá uno para ver el detalle."
        acciones={
          <>
            <Button
              variant={sonido === 'bloqueado' ? 'default' : 'outline'}
              onClick={() => void activarSonido()}
              aria-pressed={sonido === 'activo'}
            >
              {sonido === 'activo' ? <Bell /> : <BellOff />}
              {sonido === 'activo'
                ? 'Sonido activado'
                : sonido === 'bloqueado'
                  ? 'Tocá para activar el sonido'
                  : 'Activar sonido'}
            </Button>
            <Button onClick={() => setNuevoAbierto(true)}>
              <Plus /> Nuevo pedido
            </Button>
          </>
        }
      />

      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {aviso && (
        <p
          role="status"
          className={cn(
            'rounded-lg p-3 text-sm',
            aviso.tipo === 'ok'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {aviso.texto}
        </p>
      )}

      {/* Totales del día */}
      <section aria-label="Totales del día" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Dato
          titulo="Pedidos"
          valor={String(caja.pedidos)}
          detalle={
            caja.anulados
              ? `${caja.anulados} ${caja.anulados === 1 ? 'anulado' : 'anulados'}`
              : undefined
          }
        />
        <Dato titulo="Efectivo" valor={formatARS(caja.porMedio.efectivo)} />
        <Dato titulo="Transferencias" valor={formatARS(caja.porMedio.transferencia)} />
        <Dato titulo="Por cobrar" valor={formatARS(caja.porCobrar)} resaltar={caja.porCobrar > 0} />
      </section>

      {/* Celular: pestañas; escritorio: columnas */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 md:hidden" role="tablist">
        {COLUMNAS.map((c) => {
          const n = pedidos.filter((p) => c.estados.includes(p.estado)).length;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={pestana === c.id}
              onClick={() => setPestana(c.id)}
              className={cn(
                'flex-1 rounded-md px-2 py-2 text-sm whitespace-nowrap',
                pestana === c.id ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground',
              )}
            >
              {c.titulo.split(' /')[0]} {n > 0 && <span className="tabular-nums">({n})</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNAS.map((c) => {
          const lista = pedidos
            .filter((p) => c.estados.includes(p.estado))
            // Lo más viejo primero: es lo que hay que sacar antes.
            .sort((a, b) => (a.creadoEn?.toMillis() ?? 0) - (b.creadoEn?.toMillis() ?? 0));
          return (
            <section
              key={c.id}
              aria-label={c.titulo}
              className={cn('space-y-2', pestana !== c.id && 'hidden md:block')}
            >
              <h2 className="hidden items-center gap-2 text-sm font-semibold md:flex">
                {c.titulo}
                <span className="rounded-full bg-muted px-2 text-xs tabular-nums">
                  {lista.length}
                </span>
              </h2>
              {lista.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {c.id === 'nuevos' ? 'Sin pedidos nuevos por ahora.' : 'Nada por acá.'}
                </p>
              ) : (
                lista.map(tarjeta)
              )}
            </section>
          );
        })}
      </div>

      {terminados.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setVerTerminados((v) => !v)}
            className="flex items-center gap-1 text-sm font-semibold"
            aria-expanded={verTerminados}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', verTerminados && 'rotate-180')}
            />
            Terminados ({terminados.length})
          </button>
          {verTerminados && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {terminados.map(tarjeta)}
            </div>
          )}
        </section>
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
          detalle && void ejecutar(detalle.id, () => anularCobros(detalle), 'Cobro deshecho')
        }
      />
      <DialogoCobro
        pedido={aCobrar}
        onCerrar={() => setCobroId(null)}
        onConfirmar={async (cobro) => {
          if (!aCobrar) return;
          await ejecutar(
            aCobrar.id,
            () => registrarCobro(aCobrar, cobro, uid),
            `Cobro de ${formatARS(cobro.monto)} registrado en el #${aCobrar.numero}`,
          );
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
          setAviso({ tipo: 'ok', texto: `Pedido #${numero} cargado` });
        }}
      />
    </div>
  );
}

function Dato(props: {
  titulo: string;
  valor: string;
  detalle?: string | undefined;
  resaltar?: boolean;
}) {
  return (
    <div className={cn('rounded-xl border bg-card p-3', props.resaltar && 'border-amber-500/50')}>
      <p className="text-xs text-muted-foreground">{props.titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{props.valor}</p>
      {props.detalle && <p className="text-xs text-muted-foreground">{props.detalle}</p>}
    </div>
  );
}
