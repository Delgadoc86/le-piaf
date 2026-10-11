'use client';

import { DOC_LOCAL, type Local } from '@app/shared';
import { useDocumento } from '@/features/panel/firestore';
import { PosMostrador } from '@/components/panel/mostrador/pos-mostrador';

export default function MostradorPage() {
  const local = useDocumento<Local>(DOC_LOCAL);

  return (
    <div className="w-full h-full">
      <PosMostrador
        tipos={local.datos?.pedidos.tipos ?? { takeAway: true, delivery: false, salon: false }}
      />
    </div>
  );
}

