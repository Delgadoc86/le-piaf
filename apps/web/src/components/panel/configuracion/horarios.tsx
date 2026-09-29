'use client';

import { Moon, Plus, Trash2 } from 'lucide-react';
import {
  horaAMinutos,
  localEditableSchema,
  resumirHorarios,
  type LocalEditable,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Bloque } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({ horarios: true, cierresEspeciales: true });
const DIAS = [
  [1, 'Lun'],
  [2, 'Mar'],
  [3, 'Mié'],
  [4, 'Jue'],
  [5, 'Vie'],
  [6, 'Sáb'],
  [0, 'Dom'],
] as const;

export function Horarios({ local }: { local: LocalEditable }) {
  return (
    <FormularioSeccion
      esquema={esquema}
      inicial={{ horarios: local.horarios, cierresEspeciales: local.cierresEspeciales ?? [] }}
    >
      {(f) => {
        const horarios = f.valor.horarios;
        const cierres = f.valor.cierresEspeciales ?? [];
        const setH = (i: number, cambio: Partial<(typeof horarios)[number]>) =>
          f.cambiar(
            'horarios',
            horarios.map((h, j) => (j === i ? { ...h, ...cambio } : h)),
          );
        return (
          <>
            <Bloque
              titulo="Horarios de atención"
              descripcion="Un turno por fila. Si cierra después de medianoche (ej. 20:00 a 02:00), se toma como el mismo turno."
            >
              {horarios.map((h, i) => {
                const cruza = h.desde && h.hasta && horaAMinutos(h.hasta) <= horaAMinutos(h.desde);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                    <div className="flex gap-1" role="group" aria-label="Días">
                      {DIAS.map(([d, n]) => {
                        const on = h.dias.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setH(i, { dias: on ? h.dias.filter((x) => x !== d) : [...h.dias, d] })
                            }
                            className={cn(
                              'h-8 w-11 rounded-md border text-xs',
                              on
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:bg-muted',
                            )}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      de{' '}
                      <Input
                        type="time"
                        className="w-28"
                        value={h.desde}
                        onChange={(e) => setH(i, { desde: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      a{' '}
                      <Input
                        type="time"
                        className="w-28"
                        value={h.hasta}
                        onChange={(e) => setH(i, { hasta: e.target.value })}
                      />
                    </label>
                    {cruza && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Moon className="size-3.5" aria-hidden /> hasta el día siguiente
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      aria-label="Quitar turno"
                      onClick={() =>
                        f.cambiar(
                          'horarios',
                          horarios.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    {f.errores[`horarios.${i}.dias`] && (
                      <p className="w-full text-sm text-destructive">Elegí al menos un día.</p>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  f.cambiar('horarios', [...horarios, { dias: [], desde: '20:00', hasta: '00:00' }])
                }
              >
                <Plus className="size-4" /> Agregar turno
              </Button>
              {horarios.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="mb-1 font-medium">Así se ve en la web:</p>
                  {resumirHorarios(horarios.filter((h) => h.dias.length > 0)).map((h) => (
                    <p key={h.dias} className="tabular-nums">
                      {h.dias}: {h.horas}
                    </p>
                  ))}
                </div>
              )}
            </Bloque>

            <Bloque
              titulo="Cierres especiales"
              descripcion="Feriados, vacaciones o eventos privados: ese día la web muestra “Cerrado”."
            >
              {cierres.map((c, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    className="w-44"
                    value={c.fecha}
                    onChange={(e) =>
                      f.cambiar(
                        'cierresEspeciales',
                        cierres.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    className="flex-1"
                    placeholder="Motivo (opcional)"
                    value={c.motivo}
                    onChange={(e) =>
                      f.cambiar(
                        'cierresEspeciales',
                        cierres.map((x, j) => (j === i ? { ...x, motivo: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar cierre"
                    onClick={() =>
                      f.cambiar(
                        'cierresEspeciales',
                        cierres.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  f.cambiar('cierresEspeciales', [...cierres, { fecha: '', motivo: '' }])
                }
              >
                <Plus className="size-4" /> Agregar cierre
              </Button>
            </Bloque>
          </>
        );
      }}
    </FormularioSeccion>
  );
}
