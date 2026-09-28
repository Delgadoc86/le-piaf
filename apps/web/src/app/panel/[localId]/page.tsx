'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalActivo } from '@/features/panel/use-local-activo';

/** Resumen del día. Vacío hasta que haya pedidos y caja (Fases 2 y 4). */
export default function ResumenPage() {
  const local = useLocalActivo();
  if (!local) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="text-muted-foreground">{local.nombre}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Ventas de hoy', 'Pedidos', 'Ticket promedio', 'Cancelados'].map((titulo) => (
          <Card key={titulo}>
            <CardHeader>
              <CardDescription>{titulo}</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Los números aparecen cuando empiecen a entrar pedidos (Fase 2) y se cierre la caja (Fase 4).
      </p>
    </div>
  );
}
