'use client';

import { useState } from 'react';
import { configConfirmacion, MINUTOS_CONFIRMACION, type LocalEditable } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bloque, IndicadorGuardado, useGuardado } from '@/components/panel/ui-panel';
import { guardarConfirmacion } from '@/features/panel/local';
import { desbloquearNumero, useBloqueados } from '@/features/panel/pedidos';
import { mensajeError } from '@/features/panel/firestore';

type Confirmacion = { clientesNuevos: boolean; aceptarSinConfirmar: boolean };

const OPCIONES: { clave: keyof Confirmacion; titulo: string; detalle: string }[] = [
  {
    clave: 'clientesNuevos',
    titulo: 'Pedir confirmación por WhatsApp a clientes nuevos',
    detalle: `Si un número nunca recibió un pedido, tiene que mandarte un WhatsApp confirmándolo. Si no lo hace en ${MINUTOS_CONFIRMACION} minutos, el pedido se cancela solo. Los clientes que ya compraron piden directo.`,
  },
  {
    clave: 'aceptarSinConfirmar',
    titulo: 'Permitir aceptar pedidos sin confirmar',
    detalle:
      'Si está apagado, un pedido sin confirmar no se puede aceptar hasta que llegue el WhatsApp. Prendelo si preferís empezar a prepararlo igual.',
  },
];

/** Pedidos falsos: confirmación de clientes nuevos y números bloqueados. */
export function ConfirmacionPedidos({ local }: { local: LocalEditable }) {
  const [valores, setValores] = useState<Confirmacion>(configConfirmacion(local.pedidos));
  const { estado, guardar } = useGuardado();
  const bloqueados = useBloqueados();
  const [error, setError] = useState<string | null>(null);

  function cambiar(clave: keyof Confirmacion, valor: boolean) {
    const nuevos = { ...valores, [clave]: valor };
    setValores(nuevos);
    void guardar(() => guardarConfirmacion(nuevos));
  }

  async function desbloquear(telefono: string) {
    setError(null);
    try {
      await desbloquearNumero(telefono);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <Bloque
      titulo="Pedidos falsos"
      descripcion="Cómo se filtran los pedidos de la web que no son reales."
    >
      <ul className="divide-y rounded-lg border">
        {OPCIONES.map((o) => (
          <li key={o.clave} className="flex items-center justify-between gap-4 p-3">
            <label htmlFor={`conf-${o.clave}`} className="min-w-0">
              <span className="block font-medium">{o.titulo}</span>
              <span className="block text-sm text-muted-foreground">{o.detalle}</span>
            </label>
            <Switch
              id={`conf-${o.clave}`}
              checked={valores[o.clave]}
              disabled={o.clave === 'aceptarSinConfirmar' && !valores.clientesNuevos}
              onCheckedChange={(v) => cambiar(o.clave, v)}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end">
        <IndicadorGuardado estado={estado} />
      </div>

      <h3 className="mt-4 mb-2 font-medium">Números bloqueados</h3>
      {bloqueados.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguno. Se bloquea desde el detalle de un pedido (“Bloquear este número”).
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {bloqueados.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium tabular-nums">+{b.telefono}</p>
                {b.motivo && <p className="truncate text-muted-foreground">{b.motivo}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => void desbloquear(b.telefono)}>
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Bloque>
  );
}
