'use client';

import { Bike, Clock, ShoppingBag, Utensils } from 'lucide-react';
import {
  formatARS,
  siguienteEstado,
  totalCobrado,
  vuelto,
  type MedioPagoManual,
  type Pedido,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ACCION_HACIA,
  COLOR_ETAPA,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  etapaDe,
  horaDe,
  MINUTOS_ALERTA_SIN_ACEPTAR,
  type PedidoConId,
} from '@/features/panel/pedidos';

export const ICONO_TIPO = { take_away: ShoppingBag, delivery: Bike, salon: Utensils } as const;

const ORIGEN: Record<Pedido['origen'], string> = {
  web: 'Web',
  mostrador: 'Mostrador',
  telefono: 'Teléfono',
  qr_mesa: 'QR',
  mozo: 'Mozo',
};

const ITEMS_VISIBLES = 6;

/** Etiqueta de pago: lo que el cliente eligió y si ya se cobró. */
export function EtiquetaPago({ pedido, className }: { pedido: Pedido; className?: string }) {
  const medio = pedido.pagoElegido.medio === 'efectivo' ? 'Efectivo' : 'Transferencia';
  const texto =
    pedido.estadoPago === 'pagado'
      ? '✓ Pagado'
      : pedido.estadoPago === 'parcial'
        ? `${medio} · pago parcial`
        : `${medio} · a cobrar`;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        pedido.estadoPago === 'pagado'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-500/20 text-amber-900 dark:text-amber-300',
        className,
      )}
    >
      {texto}
    </span>
  );
}

interface Props {
  pedido: PedidoConId;
  zonaHoraria: string;
  ahora: number;
  operable: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onAvanzar: () => void;
  /** Cobra lo que falta con ese medio, en un toque. */
  onCobrarRapido: (medio: MedioPagoManual) => void;
  /** Cobro con otro monto (parcial, vuelto): abre el diálogo. */
  onCobrarOtro: () => void;
}

/** Minutos desde que entró el pedido, con alerta si se está demorando. */
function Transcurrido({ pedido, ahora }: { pedido: Pedido; ahora: number }) {
  const desde = pedido.creadoEn?.toMillis();
  if (!desde) return null;
  const min = Math.max(0, Math.floor((ahora - desde) / 60_000));
  const sinAceptar = pedido.estado === 'pendiente' && min >= MINUTOS_ALERTA_SIN_ACEPTAR;
  const demorado =
    ['aceptado', 'en_preparacion'].includes(pedido.estado) &&
    pedido.tiempoEstimadoMin !== undefined &&
    min > pedido.tiempoEstimadoMin;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        sinAceptar || demorado ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground',
      )}
      title={
        sinAceptar
          ? 'Hace rato que espera que lo aceptes'
          : demorado
            ? 'Pasó la demora estimada'
            : undefined
      }
    >
      <Clock className="size-3" aria-hidden />
      {min < 1 ? 'recién' : `${min} min`}
    </span>
  );
}

export function TarjetaPedido({
  pedido,
  zonaHoraria,
  ahora,
  operable,
  ocupado,
  onAbrir,
  onAvanzar,
  onCobrarRapido,
  onCobrarOtro,
}: Props) {
  const siguiente = siguienteEstado(pedido.estado, pedido.tipo);
  const etapa = etapaDe(pedido.estado);
  const etapaSiguiente = siguiente ? etapaDe(siguiente) : null;
  const Icono = ICONO_TIPO[pedido.tipo];
  const anulado = pedido.estado === 'cancelado' || pedido.estado === 'rechazado';
  const terminado = siguiente === null;
  const falta = Math.max(0, pedido.total - totalCobrado(pedido.pagos));
  const cambio = vuelto(falta, pedido.pagoElegido.pagaCon);
  const medios: MedioPagoManual[] =
    pedido.pagoElegido.medio === 'transferencia'
      ? ['transferencia', 'efectivo']
      : ['efectivo', 'transferencia'];
  const visibles = pedido.items.slice(0, ITEMS_VISIBLES);
  const ocultos = pedido.items.length - visibles.length;

  return (
    <article
      className={cn(
        'rounded-xl border border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        etapa ? COLOR_ETAPA[etapa].borde : 'border-l-border',
        pedido.estado === 'pendiente' && 'ring-2 ring-amber-400/40',
        anulado && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        className="block w-full rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Ver pedido ${pedido.numero}`}
      >
        {/* Encabezado: número bien grande, de dónde viene y cuánto hace que entró */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl leading-none font-bold tabular-nums">#{pedido.numero}</span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <Icono className="size-3.5" aria-label={ETIQUETA_TIPO[pedido.tipo]} />
              {ORIGEN[pedido.origen]}
            </span>
          </div>
          {terminado ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {horaDe(pedido.creadoEn, zonaHoraria)}
            </span>
          ) : (
            <Transcurrido pedido={pedido} ahora={ahora} />
          )}
        </div>
        {pedido.cliente?.nombre && (
          <p className="mt-1.5 truncate font-semibold">{pedido.cliente.nombre}</p>
        )}

        {/* Qué hay que preparar: lo más importante de la tarjeta */}
        <ul className="mt-2 space-y-0.5 text-sm">
          {visibles.map((i) => (
            <li key={i.id}>
              <span className="font-bold tabular-nums">{i.cantidad}×</span> {i.nombre}
              {i.varianteNombre && (
                <span className="text-muted-foreground"> · {i.varianteNombre}</span>
              )}
              {i.extras.length > 0 && (
                <span className="block pl-5 text-xs text-muted-foreground">
                  + {i.extras.map((e) => e.nombre).join(', ')}
                </span>
              )}
              {i.nota && (
                <span className="block pl-5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  “{i.nota}”
                </span>
              )}
            </li>
          ))}
          {ocultos > 0 && <li className="text-xs text-muted-foreground">y {ocultos} más…</li>}
        </ul>
        {pedido.nota && (
          <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium">
            📝 {pedido.nota}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <span className="text-lg font-bold tabular-nums">{formatARS(pedido.total)}</span>
          {anulado ? (
            <span className="text-xs font-semibold text-destructive">
              {ETIQUETA_ESTADO[pedido.estado]}
            </span>
          ) : (
            <EtiquetaPago pedido={pedido} />
          )}
        </div>
      </button>

      {operable && !anulado && (
        <div className="mt-2 space-y-2">
          {siguiente && (
            <Button
              className={cn(
                'h-11 w-full text-base font-semibold',
                etapaSiguiente && COLOR_ETAPA[etapaSiguiente].boton,
              )}
              onClick={onAvanzar}
              disabled={ocupado}
            >
              {ACCION_HACIA[siguiente] ?? ETIQUETA_ESTADO[siguiente]}
            </Button>
          )}
          {falta > 0 && (
            <div className="flex items-center gap-1.5">
              {medios.map((m, n) => (
                <Button
                  key={m}
                  size="sm"
                  variant={n === 0 ? 'secondary' : 'outline'}
                  className="flex-1"
                  onClick={() => onCobrarRapido(m)}
                  disabled={ocupado}
                  title={`Cobrar ${formatARS(falta)} en ${m}`}
                >
                  {m === 'efectivo' ? '💵 Efectivo' : '🏦 Transf.'}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-xs"
                onClick={onCobrarOtro}
                disabled={ocupado}
              >
                Otro
              </Button>
            </div>
          )}
          {falta > 0 && pedido.pagoElegido.medio === 'efectivo' && cambio > 0 && (
            <p className="text-xs text-muted-foreground">
              Paga con {formatARS(pedido.pagoElegido.pagaCon ?? 0)} → vuelto{' '}
              <strong className="text-foreground">{formatARS(cambio)}</strong>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
