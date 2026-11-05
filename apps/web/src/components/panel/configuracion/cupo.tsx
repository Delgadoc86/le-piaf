'use client';

import { useState } from 'react';
import {
  configCupoTurnoSchema,
  type CategoriaDatos,
  type ConfigCupoTurno,
  type LocalEditable,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bloque, Campo, IndicadorGuardado, useGuardado } from '@/components/panel/ui-panel';
import { useColeccion } from '@/features/panel/firestore';
import { guardarCupoTurno } from '@/features/panel/local';
import { cn } from '@/lib/utils';

const CUPO_POR_DEFECTO: ConfigCupoTurno = {
  habilitado: false,
  nombreItem: 'Pizzas',
  cantidadPorDefecto: 50,
  categoriaIds: [],
  pausarAlAgotar: true,
};

/**
 * Configuración del Cupo del Turno (stock operativo simple: ej. "50 Pizzas", "40 Lomos").
 * Viene desactivado por defecto y se inicializa automáticamente al abrir cada turno de caja.
 */
export function CupoTurnoConfig({ local }: { local: LocalEditable }) {
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const [valores, setValores] = useState<ConfigCupoTurno>(local.cupo ?? CUPO_POR_DEFECTO);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const { estado, guardar, guardando } = useGuardado();

  function alternarCategoria(id: string) {
    setValores((prev) => {
      const existe = prev.categoriaIds.includes(id);
      return {
        ...prev,
        categoriaIds: existe
          ? prev.categoriaIds.filter((c) => c !== id)
          : [...prev.categoriaIds, id],
      };
    });
  }

  async function enviar() {
    setErrorValidacion(null);
    const r = configCupoTurnoSchema.safeParse({
      ...valores,
      nombreItem: valores.nombreItem.trim() || 'Unidades',
    });
    if (!r.success) {
      setErrorValidacion(r.error.issues[0]?.message ?? 'Revisá los datos del cupo');
      return;
    }
    await guardar(() => guardarCupoTurno(r.data));
  }

  return (
    <Bloque
      titulo="Cupo del turno (Stock simple)"
      descripcion="Ideal para controlar bollos de pizza, panes de lomo o pollos preparados para el turno sin llevar inventario complejo de insumos."
    >
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0">
            <span className="block font-medium">Usar cupo por turno de caja</span>
            <span className="block text-sm text-muted-foreground">
              Al abrir la caja te sugiere la cantidad habitual; cada pedido descuenta solo y si se cancela antes de cocinar se devuelve.
            </span>
          </div>
          <Switch
            checked={valores.habilitado}
            onCheckedChange={(v) => setValores((p) => ({ ...p, habilitado: v }))}
          />
        </label>

        {valores.habilitado && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Nombre del insumo / producto"
                ayuda="Ej.: Pizzas, Lomos, Empanadas."
              >
                {(id) => (
                  <Input
                    id={id}
                    value={valores.nombreItem}
                    placeholder="Ej.: Pizzas"
                    onChange={(e) => setValores((p) => ({ ...p, nombreItem: e.target.value }))}
                  />
                )}
              </Campo>
              <Campo
                etiqueta="Cantidad habitual por turno"
                ayuda="Se precarga al abrir la caja (podés ajustarla cada día)."
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min={1}
                    max={10000}
                    value={valores.cantidadPorDefecto}
                    onChange={(e) =>
                      setValores((p) => ({
                        ...p,
                        cantidadPorDefecto: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                )}
              </Campo>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Categorías que descuentan de este cupo</p>
              <p className="mb-2.5 text-xs text-muted-foreground">
                Cada producto de las categorías marcadas descuenta 1 unidad (podés cambiar el peso en productos especiales o promos).
              </p>
              {categorias.cargando ? (
                <p className="text-xs text-muted-foreground">Cargando categorías…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categorias.datos.map((c) => {
                    const activa = valores.categoriaIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => alternarCategoria(c.id)}
                        className={cn(
                          'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                          activa
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:bg-muted',
                        )}
                      >
                        {c.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <label className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3">
              <div className="min-w-0">
                <span className="block text-sm font-medium">
                  Pausar en la web cuando el cupo llegue a 0
                </span>
                <span className="block text-xs text-muted-foreground">
                  La web muestra “Agotado por hoy” en esos platos. Desde Mostrador el personal siempre puede seguir cargando aunque pase a negativo.
                </span>
              </div>
              <Switch
                checked={valores.pausarAlAgotar}
                onCheckedChange={(v) => setValores((p) => ({ ...p, pausarAlAgotar: v }))}
              />
            </label>
          </div>
        )}

        {errorValidacion && <p className="text-sm text-destructive">{errorValidacion}</p>}

        <div className="flex items-center justify-end gap-3">
          <IndicadorGuardado estado={estado} />
          <Button onClick={() => void enviar()} disabled={guardando}>
            Guardar cupo
          </Button>
        </div>
      </div>
    </Bloque>
  );
}

