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

interface Props {
  pedido: PedidoConId | null;
  onCerrar: () => void;
  onConfirmar: (cobro: {
    medio: MedioPagoManual;
    monto: number;
    pagaCon?: number;
  }) => Promise<void>;
}

/** Cobro manual: efectivo (con cálculo de vuelto) o transferencia. Por defecto, lo que falta. */
export function DialogoCobro({ pedido, onCerrar, onConfirmar }: Props) {
  return (
    <Dialog open={pedido !== null} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {pedido && <Formulario key={pedido.id} pedido={pedido} onConfirmar={onConfirmar} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  pedido,
  onConfirmar,
}: {
  pedido: PedidoConId;
  onConfirmar: Props['onConfirmar'];
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
        <DialogTitle>Cobrar pedido #{pedido.numero}</DialogTitle>
        <DialogDescription>
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
                'h-12 rounded-lg border text-sm font-medium transition-colors',
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

      <DialogFooter>
        <Button
          className="w-full sm:w-auto"
          onClick={() => void confirmar()}
          disabled={monto <= 0 || guardando}
        >
          Registrar cobro de {formatARS(monto)}
        </Button>
      </DialogFooter>
    </>
  );
}
