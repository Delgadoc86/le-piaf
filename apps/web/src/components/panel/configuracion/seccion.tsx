'use client';

/** Formulario de una sección de local/datos: valida con su parte del esquema y guarda solo esos campos. */
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { LocalEditable } from '@app/shared';
import { Button } from '@/components/ui/button';
import { useFormulario } from '@/features/panel/formulario';
import { guardarLocal } from '@/features/panel/local';
import { IndicadorGuardado, useGuardado } from '../ui-panel';

export function FormularioSeccion<S extends z.ZodType>({
  esquema,
  inicial,
  children,
}: {
  esquema: S;
  inicial: z.input<S>;
  children: (f: ReturnType<typeof useFormulario<S>>) => ReactNode;
}) {
  const f = useFormulario(esquema, inicial);
  const { estado, guardar, guardando } = useGuardado();

  async function enviar() {
    const datos = f.validar();
    if (datos) await guardar(() => guardarLocal(datos as Partial<LocalEditable>));
  }

  const hayErrores = Object.keys(f.errores).length > 0;
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      {children(f)}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        {hayErrores && <span className="text-sm text-destructive">Hay campos para revisar.</span>}
        <IndicadorGuardado estado={estado} />
        <Button type="submit" disabled={guardando}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
