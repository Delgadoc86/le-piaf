'use client';

import { Bike, ShoppingBag, Utensils } from 'lucide-react';
import { formatARS, siguienteEstado, type Pedido } from '@app/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ACCION_HACIA,
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  horaDe,
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

/** Etiqueta de pago: lo que el cliente eligió y si ya se cobró. */
export function EtiquetaPago({ pedido, className }: { pedido: Pedido; className?: string }) {
  const medio = pedido.pagoElegido.medio === 'efectivo' ? 'Efectivo' : 'Transferencia';
  const texto =
    pedido.estadoPago === 'pagado'
      ? 'Pagado'
      : pedido.estadoPago === 'parcial'
        ? `${medio} · pago parcial`
        : `${medio} · a cobrar`;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        pedido.estadoPago === 'pagado'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
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
  operable: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onAvanzar: () => void;
  onCobrar: () => void;
}

export function TarjetaPedido({
  pedido,
  zonaHoraria,
  operable,
  ocupado,
  onAbrir,
  onAvanzar,
  onCobrar,
}: Props) {
  const siguiente = siguienteEstado(pedido.estado, pedido.tipo);
  const Icono = ICONO_TIPO[pedido.tipo];
  const nuevo = pedido.estado === 'pendiente';
  const resumen = pedido.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ');
  const anulado = pedido.estado === 'cancelado' || pedido.estado === 'rechazado';

  return (
    <article
      className={cn(
        'rounded-xl border bg-card p-3 shadow-xs transition-colors',
        nuevo && 'border-amber-500/60 ring-2 ring-amber-500/20',
        anulado && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        className="block w-full rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Ver pedido ${pedido.numero}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">#{pedido.numero}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              <Icono className="size-3.5" aria-label={ETIQUETA_TIPO[pedido.tipo]} />
              {ORIGEN[pedido.origen]}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {horaDe(pedido.creadoEn, zonaHoraria)}
          </span>
        </div>
        {pedido.cliente?.nombre && <p className="mt-1 font-medium">{pedido.cliente.nombre}</p>}
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{resumen}</p>
        {pedido.nota && <p className="mt-1 line-clamp-1 text-sm italic">“{pedido.nota}”</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold tabular-nums">{formatARS(pedido.total)}</span>
          {anulado ? (
            <span className="text-xs font-medium text-destructive">
              {ETIQUETA_ESTADO[pedido.estado]}
            </span>
          ) : (
            <EtiquetaPago pedido={pedido} />
          )}
        </div>
      </button>

      {operable && !anulado && (siguiente || pedido.estadoPago !== 'pagado') && (
        <div className="mt-3 flex gap-2">
          {siguiente && (
            <Button className="flex-1" onClick={onAvanzar} disabled={ocupado}>
              {ACCION_HACIA[siguiente] ?? ETIQUETA_ESTADO[siguiente]}
            </Button>
          )}
          {pedido.estadoPago !== 'pagado' && (
            <Button
              variant="outline"
              className={cn(!siguiente && 'flex-1')}
              onClick={onCobrar}
              disabled={ocupado}
            >
              Cobrar
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
