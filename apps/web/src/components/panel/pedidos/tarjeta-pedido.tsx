'use client';

import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  User,
  Utensils,
} from 'lucide-react';
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

/** Etiqueta de pago: lo que el cliente eligió y si ya se cobró con ícono representativo. */
export function EtiquetaPago({ pedido, className }: { pedido: Pedido; className?: string }) {
  const medio = pedido.pagoElegido.medio === 'efectivo' ? 'Efectivo' : 'Transferencia';
  const pagadoCon = [
    ...new Set(pedido.pagos.filter((p) => p.estado === 'aprobado').map((p) => p.medio)),
  ]
    .map((m) => (m === 'efectivo' ? 'efectivo' : 'transferencia'))
    .join(' + ');

  if (pedido.estado === 'entregado' && pedido.estadoPago !== 'pagado') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-rose-600 bg-rose-950 px-2.5 py-0.5 text-xs font-bold text-rose-300',
          className,
        )}
      >
        <AlertCircle className="size-3 shrink-0" />
        {pedido.estadoPago === 'parcial' ? 'Entregado · pago parcial' : 'Entregado sin cobrar'}
      </span>
    );
  }
  const texto =
    pedido.estadoPago === 'pagado'
      ? `Pagado${pagadoCon ? ` · ${pagadoCon}` : ''}`
      : pedido.estadoPago === 'parcial'
        ? `${medio} · pago parcial`
        : `${medio} · a cobrar`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
        pedido.estadoPago === 'pagado'
          ? 'border border-emerald-700/60 bg-emerald-950/80 text-emerald-400'
          : 'border border-amber-700/60 bg-amber-950/80 text-amber-300',
        className,
      )}
    >
      {pedido.estadoPago === 'pagado' ? (
        <CheckCircle2 className="size-3 shrink-0" />
      ) : (
        <Coins className="size-3 shrink-0" />
      )}
      <span>{texto}</span>
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
  /** Llegó el WhatsApp del cliente nuevo. */
  onConfirmar: () => void;
  /** Config del local: se puede aceptar un pedido que el cliente todavía no confirmó. */
  aceptarSinConfirmar: boolean;
}

/** Cuenta regresiva hasta que un pedido sin confirmar se cancela solo. */
function VenceEn({ pedido, ahora }: { pedido: Pedido; ahora: number }) {
  const vence = pedido.confirmarAntesDe?.toMillis();
  if (!vence) return null;
  const min = Math.max(0, Math.ceil((vence - ahora) / 60_000));
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
      <Clock className="size-3 shrink-0 text-amber-400" />
      Sin confirmar · {min > 0 ? `vence en ${min} min` : 'vencido'}
    </span>
  );
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
  const urgente = sinAceptar || demorado;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold tabular-nums',
        urgente
          ? 'border border-red-500/60 bg-red-950/60 text-red-300 animate-pulse'
          : 'border border-slate-700 bg-slate-800/80 text-slate-300',
      )}
      title={
        sinAceptar
          ? 'Hace rato que espera que lo aceptes'
          : demorado
            ? 'Pasó la demora estimada'
            : undefined
      }
    >
      {urgente ? (
        <AlertTriangle className="size-3.5 text-red-400 shrink-0" aria-hidden />
      ) : (
        <Clock className="size-3.5 shrink-0" aria-hidden />
      )}
      {min < 1 ? 'recién' : `hace ${min} min`}
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
  onConfirmar,
  aceptarSinConfirmar,
}: Props) {
  const sinConfirmar = pedido.porConfirmar === true && pedido.estado === 'pendiente';
  const siguiente = siguienteEstado(pedido.estado, pedido.tipo);
  const etapa = etapaDe(pedido.estado);
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
        'rounded-2xl border-2 bg-[#111827] text-white p-4 shadow-lg transition-all hover:shadow-xl',
        etapa ? COLOR_ETAPA[etapa].borde : 'border-slate-800',
        sinConfirmar && 'border-dashed border-zinc-600 bg-slate-900/60',
        anulado && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onAbrir}
        className="block w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Ver pedido ${pedido.numero}`}
      >
        {/* Encabezado: número bien grande (#104) y origen como chip redondeado con icono */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display-comanda text-3xl leading-none font-black text-white">
              #{pedido.numero}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              <Icono className="size-3 text-orange-400" aria-label={ETIQUETA_TIPO[pedido.tipo]} />
              <span>{ORIGEN[pedido.origen]}</span>
            </span>
          </div>
          {terminado ? (
            <span className="flex items-center gap-1 text-xs font-medium text-slate-400 tabular-nums">
              <Clock className="size-3 text-slate-500" />
              {horaDe(pedido.creadoEn, zonaHoraria)}
            </span>
          ) : sinConfirmar ? (
            <VenceEn pedido={pedido} ahora={ahora} />
          ) : (
            <Transcurrido pedido={pedido} ahora={ahora} />
          )}
        </div>

        {/* Nombre del cliente */}
        {pedido.cliente?.nombre && (
          <p className="mt-2.5 flex items-center gap-1.5 truncate text-base font-bold text-white">
            <User className="size-4 text-slate-400 shrink-0" />
            <span className="truncate">{pedido.cliente.nombre}</span>
          </p>
        )}

        {pedido.tipo === 'delivery' && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1 truncate font-medium">
              <MapPin className="size-3.5 text-cyan-400 shrink-0" />
              {pedido.entrega?.direccion}
            </span>
            {pedido.costoEnvio === 0 && (
              <span className="rounded-full border border-amber-800/60 bg-amber-950/60 px-2 py-0.5 font-bold text-amber-300">
                Envío a confirmar
              </span>
            )}
          </p>
        )}

        {/* Lista de comanda con cantidades en blanco nítido y notas de cocina de alto impacto */}
        <ul className="mt-2.5 space-y-1.5 text-sm text-slate-200">
          {visibles.map((i) => (
            <li key={i.id} className="leading-snug">
              <div className="flex items-start">
                <span className="inline-flex items-center justify-center min-w-7 h-6 px-1.5 rounded-lg bg-white text-slate-950 font-black text-sm tabular-nums mr-2 shrink-0 shadow-xs">
                  {i.cantidad}x
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-base text-white">{i.nombre}</span>
                  {i.varianteNombre && (
                    <span className="text-slate-300 font-semibold text-xs"> · {i.varianteNombre}</span>
                  )}
                  {i.extras.length > 0 && (
                    <span className="block text-xs font-semibold text-slate-300">
                      + {i.extras.map((e) => e.nombre).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              {i.nota && (
                <div className="mt-1 ml-9 flex items-center gap-1.5 rounded-lg bg-amber-400 text-slate-950 px-2 py-0.5 text-xs font-black shadow-xs">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>⚠️ COCINA: “{i.nota}”</span>
                </div>
              )}
            </li>
          ))}
          {ocultos > 0 && <li className="pl-9 text-xs font-bold text-slate-400">y {ocultos} más…</li>}
        </ul>

        {pedido.nota && (
          <div className="mt-2.5 rounded-xl border-2 border-amber-400 bg-amber-400/20 px-3 py-2 text-xs font-black text-amber-200 flex items-start gap-2 shadow-sm">
            <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="uppercase tracking-wider text-amber-300 font-black">
                Aclaración de Comanda:
              </span>
              <p className="text-white text-sm font-bold mt-0.5">“{pedido.nota}”</p>
            </div>
          </div>
        )}

        {/* Total y etiqueta de pago */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2.5">
          <span className="display-dinero text-xl font-black text-white tabular-nums">
            {formatARS(pedido.total)}
          </span>
          {anulado ? (
            <span className="text-xs font-bold text-rose-400">
              {ETIQUETA_ESTADO[pedido.estado]}
            </span>
          ) : (
            <EtiquetaPago pedido={pedido} />
          )}
        </div>
      </button>

      {/* Acciones */}
      {operable && sinConfirmar && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs text-slate-400">
            Cliente nuevo: esperá su WhatsApp confirmando el #{pedido.numero}.
          </p>
          <Button
            className="h-12 w-full rounded-xl bg-[#25D366] text-base font-bold text-white shadow-sm hover:bg-[#1fb457] flex items-center justify-center gap-2"
            onClick={onConfirmar}
            disabled={ocupado}
          >
            <MessageSquare className="size-4 shrink-0" />
            <span>Ya confirmó por WhatsApp</span>
          </Button>
          {aceptarSinConfirmar && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium text-slate-400 hover:text-white"
              onClick={onAvanzar}
              disabled={ocupado}
            >
              Aceptar igual, sin confirmar
            </Button>
          )}
        </div>
      )}

      {operable && !anulado && !sinConfirmar && (
        <div className="mt-3 space-y-2">
          {siguiente && (
            <Button
              className={cn(
                'h-14 w-full rounded-2xl text-base md:text-lg font-black shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-2',
                etapa && COLOR_ETAPA[etapa].boton,
              )}
              onClick={onAvanzar}
              disabled={ocupado}
            >
              {etapa === 'nuevos' ? (
                <Check className="size-6 shrink-0" />
              ) : etapa === 'preparacion' ? (
                <CheckCircle2 className="size-6 shrink-0" />
              ) : (
                <Sparkles className="size-6 shrink-0" />
              )}
              <span>
                {siguiente === 'entregado' && falta > 0
                  ? 'Cobrar y entregar'
                  : (etapa ? COLOR_ETAPA[etapa].textoBoton : (ACCION_HACIA[siguiente] ?? ETIQUETA_ESTADO[siguiente]))}
              </span>
            </Button>
          )}

          {falta > 0 && (
            <div className="flex items-center gap-1.5">
              {medios.map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant="outline"
                  className="h-12 flex-1 rounded-xl border-slate-700 bg-slate-800 text-xs md:text-sm font-black text-slate-200 hover:bg-slate-700 hover:text-white flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
                  onClick={() => onCobrarRapido(m)}
                  disabled={ocupado}
                  title={`Cobrar ${formatARS(falta)} en ${m}`}
                >
                  {m === 'efectivo' ? (
                    <>
                      <Banknote className="size-4 text-emerald-400" />
                      <span>Efectivo</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="size-4 text-blue-400" />
                      <span>Transf.</span>
                    </>
                  )}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-12 rounded-xl px-2.5 text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                onClick={onCobrarOtro}
                disabled={ocupado}
              >
                <CreditCard className="size-4" />
                <span>Otro</span>
              </Button>
            </div>
          )}

          {falta > 0 && pedido.pagoElegido.medio === 'efectivo' && cambio > 0 && (
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <Coins className="size-3 text-amber-400 shrink-0" />
              <span>
                Paga con {formatARS(pedido.pagoElegido.pagaCon ?? 0)} → vuelto{' '}
                <strong className="text-white">{formatARS(cambio)}</strong>
              </span>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
