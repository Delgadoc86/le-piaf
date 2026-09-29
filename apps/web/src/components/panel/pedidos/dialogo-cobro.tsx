'use client';

import { useState } from 'react';
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

interface Props {
  pedido: PedidoConId | null;
  /** true: se abrió al tocar "Entregado" con el pedido sin cobrar (cobrar y entregar juntos). */
  entregar?: boolean;
  onCerrar: () => void;
  onConfirmar: (cobro: CobroManual) => Promise<void>;
  /** Solo con `entregar`: se entrega y el pedido queda en "Por cobrar". */
  onEntregarSinCobrar?: () => void;
}

/** Cobro manual: efectivo (con cálculo de vuelto) o transferencia. Por defecto, lo que falta. */
export function DialogoCobro({
  pedido,
  entregar,
  onCerrar,
  onConfirmar,
  onEntregarSinCobrar,
}: Props) {
  return (
    <Dialog open={pedido !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
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
  const [medio, setMedio] = useState<MedioPagoManual>(pedido.pagoElegido.medio);
  const [monto, setMonto] = useState(falta);
  const [pagaCon, setPagaCon] = useState(pedido.pagoElegido.pagaCon ?? 0);
  const [guardando, setGuardando] = useState(false);
  const cambio = medio === 'efectivo' ? vuelto(monto, pagaCon) : 0;

  async function confirmar() {
    setGuardando(true);
    try {
      await onConfirmar({
        medio,
        monto,
        ...(medio === 'efectivo' && pagaCon > monto ? { pagaCon } : {}),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {entregar ? `¿Cómo pagó el #${pedido.numero}?` : `Cobrar pedido #${pedido.numero}`}
        </DialogTitle>
        <DialogDescription>
          {entregar ? 'Antes de entregarlo, registrá el pago. ' : ''}
          Total {formatARS(pedido.total)}
          {falta !== pedido.total && <> · falta {formatARS(falta)}</>}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medio de pago">
          {(['efectivo', 'transferencia'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={medio === m}
              onClick={() => setMedio(m)}
              className={cn(
                'h-14 rounded-lg border text-base font-semibold transition-colors',
                medio === m
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {m === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="monto-cobro">Monto</Label>
          <InputPesos id="monto-cobro" valor={monto} onCambio={setMonto} />
          {monto > 0 && monto < falta && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Queda {formatARS(falta - monto)} por cobrar.
            </p>
          )}
        </div>

        {medio === 'efectivo' && (
          <div className="space-y-1.5">
            <Label htmlFor="paga-con">Paga con (opcional)</Label>
            <InputPesos id="paga-con" valor={pagaCon} onCambio={setPagaCon} />
            {cambio > 0 && (
              <p className="text-sm font-medium">
                Vuelto: <span className="tabular-nums">{formatARS(cambio)}</span>
              </p>
            )}
          </div>
        )}
        {medio === 'transferencia' && (
          <p className="text-sm text-muted-foreground">
            Confirmá solo cuando veas la transferencia acreditada.
          </p>
        )}
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <Button
          size="lg"
          className="w-full"
          onClick={() => void confirmar()}
          disabled={monto <= 0 || guardando}
        >
          {entregar
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
