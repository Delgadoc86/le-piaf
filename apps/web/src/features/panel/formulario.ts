'use client';

/**
 * Formulario chico: estado + validación con el esquema zod de @app/shared (el mismo que usan
 * las reglas de negocio). Los errores quedan indexados por ruta ("variantes.0.precio").
 */
import { useCallback, useState } from 'react';
import type { z } from 'zod';

export function useFormulario<S extends z.ZodType>(esquema: S, inicial: z.input<S>) {
  const [valor, setValor] = useState<z.input<S>>(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});

  /** Cambia un campo (o aplica una función sobre el estado completo). */
  const cambiar = useCallback(<K extends keyof z.input<S>>(campo: K, v: z.input<S>[K]) => {
    setValor((prev) => ({ ...(prev as object), [campo]: v }) as z.input<S>);
    setErrores((e) => {
      const resto = { ...e };
      delete resto[campo as string];
      return resto;
    });
  }, []);

  /** Valida; si está bien devuelve los datos limpios (con defaults del esquema), si no, null. */
  const validar = useCallback((): z.output<S> | null => {
    const r = esquema.safeParse(valor);
    if (r.success) {
      setErrores({});
      return r.data;
    }
    const nuevos: Record<string, string> = {};
    for (const i of r.error.issues) {
      const clave = i.path.join('.') || '_';
      nuevos[clave] ??= i.message;
    }
    setErrores(nuevos);
    return null;
  }, [esquema, valor]);

  return { valor, setValor, cambiar, errores, validar };
}
