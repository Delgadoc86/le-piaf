'use client';

import { useState } from 'react';
import type { LocalEditable } from '@app/shared';
import { Switch } from '@/components/ui/switch';
import { Bloque, IndicadorGuardado, useGuardado } from '@/components/panel/ui-panel';
import { guardarTiposEntrega } from '@/features/panel/local';

type Tipos = LocalEditable['pedidos']['tipos'];

const OPCIONES: { clave: keyof Tipos; titulo: string; detalle: string }[] = [
  {
    clave: 'takeAway',
    titulo: 'Retiro en el local',
    detalle: 'El cliente pasa a buscar su pedido.',
  },
  {
    clave: 'delivery',
    titulo: 'Delivery',
    detalle:
      'El cliente deja su dirección. Vos le confirmás por WhatsApp si llegás a su zona y cuánto sale el envío, y lo cargás en el pedido.',
  },
];

/** Qué formas de entrega ofrece la web. Se guarda al tocar (tiene que quedar al menos una). */
export function Entrega({ local }: { local: LocalEditable }) {
  const [tipos, setTipos] = useState<Tipos>(local.pedidos.tipos);
  const { estado, guardar } = useGuardado();

  function cambiar(clave: keyof Tipos, valor: boolean) {
    const nuevos = { ...tipos, [clave]: valor };
    if (!nuevos.takeAway && !nuevos.delivery && !nuevos.salon) return; // al menos una
    setTipos(nuevos);
    void guardar(() => guardarTiposEntrega(nuevos));
  }

  return (
    <Bloque
      titulo="Formas de entrega"
      descripcion="Lo que el cliente puede elegir al hacer el pedido en la web."
    >
      <ul className="divide-y rounded-lg border">
        {OPCIONES.map((o) => (
          <li key={o.clave} className="flex items-center justify-between gap-4 p-3">
            <label htmlFor={`entrega-${o.clave}`} className="min-w-0">
              <span className="block font-medium">{o.titulo}</span>
              <span className="block text-sm text-muted-foreground">{o.detalle}</span>
            </label>
            <Switch
              id={`entrega-${o.clave}`}
              checked={tipos[o.clave]}
              onCheckedChange={(v) => cambiar(o.clave, v)}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end">
        <IndicadorGuardado estado={estado} />
      </div>
    </Bloque>
  );
}
