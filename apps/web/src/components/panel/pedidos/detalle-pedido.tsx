'use client';

import { useState } from 'react';
import { Clock, MapPin, Minus, Plus } from 'lucide-react';
import {
  formatARS,
  puedePasar,
  siguienteEstado,
  totalCobrado,
  vuelto,
  type EstadoPedido,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { InputPesos } from '@/components/panel/ui-panel';
import { cn } from '@/lib/utils';
import { linkWhatsApp } from '@/lib/whatsapp';
import {
  ACCION_HACIA,
  COLOR_ETAPA,
  etapaDe,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  horaDe,
  mensajeParaCliente,
  type PedidoConId,
} from '@/features/panel/pedidos';
import { EtiquetaPago, ICONO_TIPO } from './tarjeta-pedido';

interface Props {
  pedido: PedidoConId | null;
  zonaHoraria: string;
  nombreLocal: string;
  operable: boolean;
  ocupado: boolean;
  onCerrar: () => void;
  onEstado: (estado: EstadoPedido, motivo?: string) => void;
  onDemora: (minutos: number) => void;
  onCobrar: () => void;
  onAnularCobros: () => void;
  onEnvio: (costo: number) => void;
  onConfirmar: () => void;
  /** Bloquea el número del cliente (y cancela el pedido si todavía no se aceptó). */
  onBloquear: (motivo: string) => void;
  /** Solo dueño y encargado bloquean números. */
  puedeBloquear: boolean;
  aceptarSinConfirmar: boolean;
}

const MOTIVOS = ['Nos quedamos sin stock', 'Estamos por cerrar', 'No pudimos contactarte'];

export function DetallePedido(props: Props) {
  return (
    <Dialog open={props.pedido !== null} onOpenChange={(o) => !o && props.onCerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {props.pedido && <Contenido key={props.pedido.id} {...props} pedido={props.pedido} />}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  pedido,
  zonaHoraria,
  nombreLocal,
  operable,
  ocupado,
  onEstado,
  onDemora,
  onCobrar,
  onAnularCobros,
  onEnvio,
  onConfirmar,
  onBloquear,
  puedeBloquear,
  aceptarSinConfirmar,
}: Props & { pedido: PedidoConId }) {
  const [anulando, setAnulando] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState('Pedido falso');
  const sinConfirmar = pedido.porConfirmar === true && pedido.estado === 'pendiente';
  const aceptarBloqueado = sinConfirmar && !aceptarSinConfirmar;
  const [motivo, setMotivo] = useState('');
  const [envio, setEnvio] = useState(pedido.costoEnvio);
  const siguiente = siguienteEstado(pedido.estado, pedido.tipo);
  const etapaSiguiente = siguiente ? etapaDe(siguiente) : null;
  const Icono = ICONO_TIPO[pedido.tipo];
  const accionAnular: EstadoPedido | null = puedePasar(pedido.estado, 'rechazado', pedido.tipo)
    ? 'rechazado'
    : puedePasar(pedido.estado, 'cancelado', pedido.tipo)
      ? 'cancelado'
      : null;
  const cobrado = totalCobrado(pedido.pagos);
  const mensaje = mensajeParaCliente(pedido, nombreLocal);
  const cambio = vuelto(pedido.total, pedido.pagoElegido.pagaCon);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          Pedido #{pedido.numero}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {ETIQUETA_ESTADO[pedido.estado]}
          </span>
        </DialogTitle>
        <DialogDescription className="flex items-center gap-1.5">
          <Icono className="size-4" aria-hidden /> {ETIQUETA_TIPO[pedido.tipo]} ·{' '}
          {horaDe(pedido.creadoEn, zonaHoraria)} ·{' '}
          {pedido.origen === 'web'
            ? 'por la web'
            : pedido.origen === 'telefono'
              ? 'por teléfono'
              : 'en mostrador'}
        </DialogDescription>
      </DialogHeader>

      {/* Cliente nuevo: confirmación por WhatsApp */}
      {sinConfirmar && (
        <section className="space-y-2 rounded-lg border border-dashed border-zinc-400 bg-muted/40 p-3 text-sm">
          <p className="font-medium">⏳ Esperando que el cliente lo confirme por WhatsApp</p>
          <p className="text-muted-foreground">
            Es su primer pedido. Cuando te llegue su mensaje con el #{pedido.numero}, tocá “Ya
            confirmó”. Si no confirma, se cancela solo.
          </p>
          {operable && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#25D366] text-white hover:bg-[#1fb457]"
                onClick={onConfirmar}
                disabled={ocupado}
              >
                ✓ Ya confirmó por WhatsApp
              </Button>
              {pedido.cliente?.telefono && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={linkWhatsApp(
                      pedido.cliente.telefono,
                      `¡Hola! Recibimos tu pedido #${pedido.numero} en ${nombreLocal}. ¿Nos lo confirmás?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Escribirle
                  </a>
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Ítems: lo más importante, bien grande para la cocina */}
      <ul className="divide-y rounded-lg border">
        {pedido.items.map((i) => (
          <li key={i.id} className="flex gap-3 p-3">
            <span className="text-lg font-bold tabular-nums">{i.cantidad}×</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {i.nombre}
                {i.varianteNombre && (
                  <span className="text-muted-foreground"> · {i.varianteNombre}</span>
                )}
              </p>
              {i.extras.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  + {i.extras.map((e) => e.nombre).join(', ')}
                </p>
              )}
              {i.nota && (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">“{i.nota}”</p>
              )}
            </div>
            <span className="text-sm tabular-nums">{formatARS(i.subtotal)}</span>
          </li>
        ))}
        {pedido.costoEnvio > 0 && (
          <li className="flex justify-between p-3 text-sm">
            <span>🛵 Envío</span>
            <span className="tabular-nums">{formatARS(pedido.costoEnvio)}</span>
          </li>
        )}
        <li className="flex justify-between p-3 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatARS(pedido.total)}</span>
        </li>
      </ul>
      {pedido.nota && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm">
          <strong>Nota:</strong> {pedido.nota}
        </p>
      )}

      {/* Cliente y entrega */}
      {(pedido.cliente || pedido.entrega) && (
        <section className="space-y-2 text-sm">
          {pedido.cliente && (
            <p>
              <span className="text-muted-foreground">Cliente:</span>{' '}
              <strong>{pedido.cliente.nombre || 'Sin nombre'}</strong>
              {pedido.cliente.telefono && (
                <a href={`tel:+${pedido.cliente.telefono}`} className="ml-2 underline">
                  +{pedido.cliente.telefono}
                </a>
              )}
            </p>
          )}
          {pedido.entrega && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.entrega.direccion)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 underline"
            >
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {pedido.entrega.direccion}
              {pedido.entrega.referencia && ` (${pedido.entrega.referencia})`}
            </a>
          )}
          {pedido.cliente?.telefono && mensaje && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={linkWhatsApp(pedido.cliente.telefono, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Avisar por WhatsApp: “{ETIQUETA_ESTADO[pedido.estado]}”
              </a>
            </Button>
          )}
        </section>
      )}

      {/* Envío: delivery sin zonas, el local confirma zona y costo por WhatsApp */}
      {pedido.tipo === 'delivery' && (
        <section
          className={cn(
            'space-y-2 rounded-lg border p-3 text-sm',
            pedido.costoEnvio === 0 && 'border-amber-500/60 bg-amber-500/5',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Envío</span>
            {pedido.costoEnvio === 0 ? (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
                A confirmar
              </span>
            ) : (
              <span className="font-semibold tabular-nums">{formatARS(pedido.costoEnvio)}</span>
            )}
          </div>
          {operable && (
            <div className="flex items-end gap-2">
              <div className="w-36">
                <InputPesos valor={envio} onCambio={setEnvio} placeholder="Costo" />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado || envio === pedido.costoEnvio}
                onClick={() => onEnvio(envio)}
              >
                Guardar envío
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Confirmale al cliente por WhatsApp si llegás a su zona y cuánto sale. Al guardarlo, se
            suma al total y lo ve en su seguimiento.
          </p>
        </section>
      )}

      {/* Pago */}
      <section className="space-y-2 rounded-lg border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Pago</span>
          <EtiquetaPago pedido={pedido} />
        </div>
        {pedido.pagoElegido.medio === 'efectivo' && cambio > 0 && (
          <p>
            Paga con {formatARS(pedido.pagoElegido.pagaCon ?? 0)} →{' '}
            <strong>vuelto {formatARS(cambio)}</strong>
          </p>
        )}
        {pedido.pagos.length > 0 && (
          <ul className="space-y-0.5 text-muted-foreground">
            {pedido.pagos.map((p, n) => (
              <li key={n}>
                {p.medio === 'efectivo' ? 'Efectivo' : 'Transferencia'}: {formatARS(p.monto)}
              </li>
            ))}
          </ul>
        )}
        {operable && (
          <div className="flex flex-wrap gap-2">
            {cobrado < pedido.total && (
              <Button size="sm" onClick={onCobrar} disabled={ocupado}>
                Cobrar {formatARS(pedido.total - cobrado)}
              </Button>
            )}
            {pedido.pagos.length > 0 && (
              <Button size="sm" variant="ghost" onClick={onAnularCobros} disabled={ocupado}>
                Deshacer cobro
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Demora estimada (se ve en el seguimiento del cliente) */}
      {operable && ['pendiente', 'aceptado', 'en_preparacion'].includes(pedido.estado) && (
        <section className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden /> Demora
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Restar 5 minutos"
              onClick={() => onDemora((pedido.tiempoEstimadoMin ?? 0) - 5)}
              disabled={ocupado}
            >
              <Minus />
            </Button>
            <span className="w-16 text-center font-medium tabular-nums">
              {pedido.tiempoEstimadoMin ?? 0} min
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Sumar 5 minutos"
              onClick={() => onDemora((pedido.tiempoEstimadoMin ?? 0) + 5)}
              disabled={ocupado}
            >
              <Plus />
            </Button>
          </div>
        </section>
      )}

      {pedido.motivoCancelacion && (
        <p className="text-sm text-destructive">Motivo: {pedido.motivoCancelacion}</p>
      )}

      {/* Acciones */}
      {operable && !anulando && (siguiente || accionAnular) && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {accionAnular ? (
            <Button variant="ghost" className="text-destructive" onClick={() => setAnulando(true)}>
              {accionAnular === 'rechazado' ? 'Rechazar' : 'Cancelar pedido'}
            </Button>
          ) : (
            <span />
          )}
          {siguiente && (
            <Button
              size="lg"
              className={cn(etapaSiguiente && COLOR_ETAPA[etapaSiguiente].boton)}
              onClick={() => onEstado(siguiente)}
              disabled={ocupado || aceptarBloqueado}
              title={aceptarBloqueado ? 'Primero tiene que confirmarlo por WhatsApp' : undefined}
            >
              {siguiente === 'entregado' && cobrado < pedido.total
                ? 'Cobrar y entregar'
                : (ACCION_HACIA[siguiente] ?? ETIQUETA_ESTADO[siguiente])}
            </Button>
          )}
        </div>
      )}
      {anulando && accionAnular && (
        <section className="space-y-2 rounded-lg border border-destructive/40 p-3">
          <p className="text-sm font-medium">
            {accionAnular === 'rechazado' ? '¿Por qué lo rechazás?' : '¿Por qué se cancela?'} (lo ve
            el cliente)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
              >
                {m}
              </button>
            ))}
          </div>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAnulando(false)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={ocupado || motivo.trim().length < 3}
              onClick={() => onEstado(accionAnular, motivo.trim())}
            >
              {accionAnular === 'rechazado' ? 'Rechazar pedido' : 'Cancelar pedido'}
            </Button>
          </div>
        </section>
      )}
      {/* Bloquear número: pedidos falsos o bromas */}
      {puedeBloquear && pedido.cliente?.telefono && pedido.origen === 'web' && (
        <section className="border-t pt-3">
          {!bloqueando ? (
            <button
              type="button"
              onClick={() => setBloqueando(true)}
              className="text-xs text-muted-foreground underline hover:text-destructive"
            >
              Bloquear este número (pedido falso)
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
              <p className="font-medium">
                ¿Bloquear +{pedido.cliente.telefono}? No va a poder pedir más por la web.
                {pedido.estado === 'pendiente' && ' Este pedido se cancela.'}
              </p>
              <Textarea
                rows={1}
                value={motivoBloqueo}
                onChange={(e) => setMotivoBloqueo(e.target.value.slice(0, 120))}
                aria-label="Motivo (solo lo ve el local)"
              />
              <p className="text-xs text-muted-foreground">
                El motivo solo lo ve el local. Se puede desbloquear desde Configuración.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setBloqueando(false)}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={ocupado}
                  onClick={() => {
                    onBloquear(motivoBloqueo);
                    setBloqueando(false);
                  }}
                >
                  Bloquear número
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
