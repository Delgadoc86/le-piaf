'use client';

/**
 * "Abierto ahora" / "Cerrado · abre a las 20:00". Se calcula en el navegador (depende de la hora
 * actual) para que la página siga siendo HTML estático; se actualiza cada minuto.
 */
import { useEffect, useState } from 'react';
import { estaAbierto, proximaApertura, type DatosHorario } from '@app/shared';
import { nombreDia } from '@app/shared';
import { cn } from '@/lib/utils';

type Estado = { abierto: true } | { abierto: false; texto: string };

function calcular(local: DatosHorario): Estado {
  const ahora = new Date();
  if (estaAbierto(local, ahora)) return { abierto: true };
  const prox = proximaApertura(local, ahora);
  if (!prox) return { abierto: false, texto: 'Cerrado' };
  if (prox.enDias === 0) return { abierto: false, texto: `Cerrado · abre a las ${prox.hora}` };
  if (prox.enDias === 1) return { abierto: false, texto: `Cerrado · abre mañana ${prox.hora}` };
  return { abierto: false, texto: `Cerrado · abre el ${nombreDia(prox.dia)} ${prox.hora}` };
}

export function EstadoLocal({ local, className }: { local: DatosHorario; className?: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    const actualizar = () => setEstado(calcular(local));
    actualizar();
    const id = setInterval(actualizar, 60_000);
    return () => clearInterval(id);
  }, [local]);

  return (
    <span
      role="status"
      className={cn(
        'inline-flex h-8 min-w-24 items-center gap-2 rounded-full border border-borde bg-black/35 px-3 text-xs font-medium backdrop-blur-md transition-opacity duration-500',
        estado ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      <span className="relative flex size-2" aria-hidden>
        {estado?.abierto && (
          <span className="latido absolute inset-0 rounded-full bg-emerald-400" />
        )}
        <span
          className={cn(
            'relative size-2 rounded-full',
            estado?.abierto ? 'bg-emerald-400' : 'bg-tinta-2/60',
          )}
        />
      </span>
      {estado ? (estado.abierto ? 'Abierto ahora' : estado.texto) : ' '}
    </span>
  );
}
