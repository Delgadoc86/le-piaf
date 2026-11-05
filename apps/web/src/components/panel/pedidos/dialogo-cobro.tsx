'use client';

import { useState } from 'react';
import { Banknote, Building2, Split } from 'lucide-react';
import { formatARS, totalCobrado, vuelto, type MedioPagoManual } from '@app/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { InputPesos } from '@/components/panel/ui-panel';
import { cn } from '@/lib/utils';
import type { PedidoConId } from '@/features/panel/pedidos';

export interface CobroManual {
  medio: MedioPagoManual;
  monto: number;
  pagaCon?: number;
}

type ModoCobro = MedioPagoManual | 'mixto';

interface Props {
  pedido: PedidoConId | null;
  /** true: se abrió al tocar "Entregado" con el pedido sin cobrar (cobrar y entregar juntos). */
  entregar?: boolean;
  onCerrar: () => void;
  onConfirmar: (cobro: CobroManual | readonly CobroManual[]) => Promise<void>;
  /** Solo con `entregar`: se entrega y el pedido queda en "Por cobrar". */
  onEntregarSinCobrar?: () => void;
}

/** Cobro manual: efectivo (con cálculo de vuelto), transferencia o cobro mixto en un paso. */
export function DialogoCobro({
  pedido,
  entregar,
  onCerrar,
  onConfirmar,
  onEntregarSinCobrar,
}: Props) {
  return (
    <Dialog open={pedido !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        {pedido && (
          <Formulario
            key={pedido.id}
            pedido={pedido}
            entregar={entregar ?? false}
            onConfirmar={onConfirmar}
            onEntregarSinCobrar={onEntregarSinCobrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  pedido,
  entregar,
  onConfirmar,
  onEntregarSinCobrar,
}: {
  pedido: PedidoConId;
  entregar: boolean;
  onConfirmar: Props['onConfirmar'];
  onEntregarSinCobrar: Props['onEntregarSinCobrar'];
}) {
  const falta = Math.max(0, pedido.total - totalCobrado(pedido.pagos));
  const [modo, setModo] = useState<ModoCobro>(pedido.pagoElegido.medio);
  const [monto, setMonto] = useState(falta);
  const [efectivoMixto, setEfectivoMixto] = useState(() => Math.floor(falta / 2));
  const [pagaCon, setPagaCon] = useState(pedido.pagoElegido.pagaCon ?? 0);
  const [guardando, setGuardando] = useState(false);

  const transfMixto = Math.max(0, falta - efectivoMixto);
  const cambio =
    modo === 'efectivo'
      ? vuelto(monto, pagaCon)
      : modo === 'mixto'
        ? vuelto(efectivoMixto, pagaCon)
        : 0;

  const mixtoValido = modo === 'mixto' && efectivoMixto > 0 && efectivoMixto < falta;
  const puedeConfirmar =
    !guardando && (modo === 'mixto' ? mixtoValido : monto > 0);

  async function confirmar() {
    if (!puedeConfirmar) return;
    setGuardando(true);
    try {
      if (modo === 'mixto') {
        await onConfirmar([
          {
            medio: 'efectivo',
            monto: efectivoMixto,
            ...(pagaCon > efectivoMixto ? { pagaCon } : {}),
          },
          {
            medio: 'transferencia',
            monto: transfMixto,
          },
        ]);
      } else {
        await onConfirmar({
          medio: modo,
          monto,
          ...(modo === 'efectivo' && pagaCon > monto ? { pagaCon } : {}),
        });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-black">
          {entregar ? `¿Cómo pagó el #${pedido.numero}?` : `Cobrar pedido #${pedido.numero}`}
        </DialogTitle>
        <DialogDescription>
          {entregar ? 'Antes de entregarlo, registrá el pago. ' : ''}
          Total {formatARS(pedido.total)}
          {falta !== pedido.total && <> · falta {formatARS(falta)}</>}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Medio de pago">
          {(
            [
              { id: 'efectivo', label: 'Efectivo', Icono: Banknote },
              { id: 'transferencia', label: 'Transf.', Icono: Building2 },
              { id: 'mixto', label: 'Mixto', Icono: Split },
            ] as const
          ).map(({ id, label, Icono }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={modo === id}
              onClick={() => setModo(id)}
              className={cn(
                'h-12 rounded-xl border text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5',
                modo === id
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                  : 'border-slate-200 hover:bg-muted',
              )}
            >
              <Icono className="size-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {modo === 'mixto' ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="space-y-1.5">
              <Label htmlFor="monto-efec-mixto" className="text-xs font-bold">
                1. ¿Cuánto entrega en Efectivo?
              </Label>
              <InputPesos
                id="monto-efec-mixto"
                valor={efectivoMixto}
                onCambio={(v) => setEfectivoMixto(Math.min(falta, v))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                2. Resto por Transferencia:
              </span>
              <span className="text-base font-black tabular-nums text-blue-700 dark:text-blue-300">
                {formatARS(transfMixto)}
              </span>
            </div>
            {!mixtoValido && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Ingresá un monto en efectivo menor al total ({formatARS(falta)}) para dividir el pago.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="monto-cobro">Monto a cobrar</Label>
            <InputPesos id="monto-cobro" valor={monto} onCambio={setMonto} />
            {monto > 0 && monto < falta && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Queda {formatARS(falta - monto)} por cobrar.
              </p>
            )}
          </div>
        )}

        {(modo === 'efectivo' || modo === 'mixto') && (
          <div className="space-y-1.5">
            <Label htmlFor="paga-con">Con cuánto billete paga (opcional, para vuelto)</Label>
            <InputPesos id="paga-con" valor={pagaCon} onCambio={setPagaCon} />
            {cambio > 0 && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                Vuelto a entregar: <span className="text-lg font-black tabular-nums">{formatARS(cambio)}</span>
              </p>
            )}
          </div>
        )}
        {modo === 'transferencia' && (
          <p className="text-xs font-medium text-muted-foreground">
            Confirmá cuando veas la transferencia o comprobante de Mercado Pago.
          </p>
        )}
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <Button
          size="lg"
          className="h-12 w-full rounded-xl font-black"
          onClick={() => void confirmar()}
          disabled={!puedeConfirmar}
        >
          {modo === 'mixto'
            ? entregar
              ? `Cobrar mixto (${formatARS(falta)}) y entregar`
              : `Registrar cobro mixto (${formatARS(falta)})`
            : entregar
              ? `Cobrar ${formatARS(monto)} y entregar`
              : `Registrar cobro de ${formatARS(monto)}`}
        </Button>
        {entregar && onEntregarSinCobrar && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onEntregarSinCobrar}
            disabled={guardando}
          >
            Entregar sin cobrar (queda en “Por cobrar”)
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
