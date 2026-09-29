'use client';

/** Alta y edición de promos: foto, precio, ítems incluidos y vigencia (días, franja, fecha de fin). */
import { Plus, Trash2 } from 'lucide-react';
import { promoSchema, type ProductoDatos, type PromoDatos } from '@app/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { guardarPromo } from '@/features/panel/carta';
import { useFormulario } from '@/features/panel/formulario';
import { cn } from '@/lib/utils';
import { Campo, CampoImagen, IndicadorGuardado, InputPesos, useGuardado } from './ui-panel';

export type PromoEditable = PromoDatos & { id: string | null };
type Producto = ProductoDatos & { id: string };

const DIAS = [
  [1, 'L'],
  [2, 'M'],
  [3, 'X'],
  [4, 'J'],
  [5, 'V'],
  [6, 'S'],
  [0, 'D'],
] as const;

export const promoVacia = (orden: number): PromoEditable => ({
  id: null,
  titulo: '',
  descripcion: '',
  precio: 0,
  orden,
  activa: true,
});

export function FormularioPromo({
  promo,
  productos,
  onCerrar,
}: {
  promo: PromoEditable | null;
  productos: Producto[];
  onCerrar: () => void;
}) {
  return (
    <Dialog open={promo !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {promo && (
          <Contenido
            key={promo.id ?? 'nueva'}
            promo={promo}
            productos={productos}
            onCerrar={onCerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({
  promo,
  productos,
  onCerrar,
}: {
  promo: PromoEditable;
  productos: Producto[];
  onCerrar: () => void;
}) {
  const { id, ...inicial } = promo;
  const f = useFormulario(promoSchema, inicial);
  const { estado, guardar, guardando } = useGuardado();
  const v = f.valor;
  const items = v.items ?? [];
  const vig = v.vigencia;

  async function enviar() {
    const datos = f.validar();
    if (datos && (await guardar(() => guardarPromo(id, datos)))) onCerrar();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{id ? 'Editar promo' : 'Nueva promo'}</DialogTitle>
        <DialogDescription>
          La web muestra solo las promos activas y vigentes en ese momento.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <Campo etiqueta="Título" error={f.errores.titulo}>
            {(i) => (
              <Input
                id={i}
                value={v.titulo}
                placeholder="Ej.: Lomo + papas"
                onChange={(e) => f.cambiar('titulo', e.target.value)}
              />
            )}
          </Campo>
          <Campo etiqueta="Descripción">
            {(i) => (
              <Textarea
                id={i}
                rows={2}
                value={v.descripcion}
                onChange={(e) => f.cambiar('descripcion', e.target.value)}
              />
            )}
          </Campo>
          <div className="flex items-end gap-4">
            <Campo etiqueta="Precio" error={f.errores.precio} className="w-40">
              {(i) => (
                <InputPesos id={i} valor={v.precio} onCambio={(n) => f.cambiar('precio', n)} />
              )}
            </Campo>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={v.activa} onCheckedChange={(c) => f.cambiar('activa', c)} /> Activa
            </label>
          </div>
        </div>
        <CampoImagen
          etiqueta="Foto"
          valor={v.fotoUrl}
          onCambio={(u) => f.cambiar('fotoUrl', u || undefined)}
          carpeta="promos"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Qué incluye?</legend>
        <p className="text-xs text-muted-foreground">
          Opcional. Sirve para que cocina sepa qué preparar y para las estadísticas.
        </p>
        {items.map((it, k) => {
          const prod = productos.find((p) => p.id === it.productoId);
          return (
            <div key={k} className="flex flex-wrap gap-2">
              <Input
                type="number"
                min={1}
                className="w-16"
                aria-label="Cantidad"
                value={it.cantidad}
                onChange={(e) =>
                  f.cambiar(
                    'items',
                    items.map((x, j) =>
                      j === k ? { ...x, cantidad: Math.max(1, Number(e.target.value)) } : x,
                    ),
                  )
                }
              />
              <select
                aria-label="Producto"
                value={it.productoId}
                className="h-9 min-w-48 flex-1 rounded-md border bg-transparent px-2 text-sm"
                onChange={(e) =>
                  f.cambiar(
                    'items',
                    items.map((x, j) =>
                      j === k ? { productoId: e.target.value, cantidad: x.cantidad } : x,
                    ),
                  )
                }
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {(prod?.variantes?.length ?? 0) > 0 && (
                <select
                  aria-label="Variante"
                  value={it.varianteId ?? ''}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                  onChange={(e) =>
                    f.cambiar(
                      'items',
                      items.map((x, j) =>
                        j === k ? { ...x, varianteId: e.target.value || undefined } : x,
                      ),
                    )
                  }
                >
                  <option value="">Cualquier variante</option>
                  {prod!.variantes!.map((va) => (
                    <option key={va.id} value={va.id}>
                      {va.nombre}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar"
                onClick={() =>
                  f.cambiar(
                    'items',
                    items.filter((_, j) => j !== k).length
                      ? items.filter((_, j) => j !== k)
                      : undefined,
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={productos.length === 0}
          onClick={() =>
            f.cambiar('items', [...items, { productoId: productos[0]!.id, cantidad: 1 }])
          }
        >
          <Plus className="size-4" /> Agregar producto
        </Button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch
            checked={vig !== undefined}
            onCheckedChange={(c) => f.cambiar('vigencia', c ? { dias: [] } : undefined)}
          />
          Limitar a ciertos días u horarios
        </label>
        {vig && (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm">Días</p>
              <div className="flex gap-1">
                {DIAS.map(([d, l]) => {
                  const on = vig.dias.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      className={cn(
                        'size-8 rounded-full border text-xs',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                      onClick={() =>
                        f.cambiar('vigencia', {
                          ...vig,
                          dias: on ? vig.dias.filter((x) => x !== d) : [...vig.dias, d],
                        })
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Sin marcar = todos.</p>
            </div>
            <div className="flex gap-2">
              <Campo etiqueta="Desde" className="flex-1">
                {(i) => (
                  <Input
                    id={i}
                    type="time"
                    value={vig.desde ?? ''}
                    onChange={(e) =>
                      f.cambiar('vigencia', { ...vig, desde: e.target.value || undefined })
                    }
                  />
                )}
              </Campo>
              <Campo etiqueta="Hasta" className="flex-1">
                {(i) => (
                  <Input
                    id={i}
                    type="time"
                    value={vig.hasta ?? ''}
                    onChange={(e) =>
                      f.cambiar('vigencia', { ...vig, hasta: e.target.value || undefined })
                    }
                  />
                )}
              </Campo>
            </div>
            <Campo etiqueta="Termina el" ayuda="Opcional (inclusive).">
              {(i) => (
                <Input
                  id={i}
                  type="date"
                  value={vig.fechaFin ?? ''}
                  onChange={(e) =>
                    f.cambiar('vigencia', { ...vig, fechaFin: e.target.value || undefined })
                  }
                />
              )}
            </Campo>
          </div>
        )}
      </fieldset>

      <DialogFooter className="items-center gap-3">
        <IndicadorGuardado estado={estado} />
        <Button variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button onClick={() => void enviar()} disabled={guardando}>
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
