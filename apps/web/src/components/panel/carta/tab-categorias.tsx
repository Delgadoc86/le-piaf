'use client';

/** Categorías: crear, renombrar (se guarda al salir del campo), ícono, visible, ordenar y borrar si está vacía. */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { categoriaSchema, type CategoriaDatos } from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  actualizarCategoria,
  eliminarCategoria,
  guardarCategoria,
  reordenar,
  siguienteOrden,
} from '@/features/panel/carta';
import { ICONOS_CATEGORIA, IconoCategoria } from '@/components/publico/tienda/ilustracion';
import { IndicadorGuardado, ListaOrdenable, useGuardado } from '../ui-panel';

type Categoria = CategoriaDatos & { id: string };

export function TabCategorias({
  categorias,
  cantidades,
}: {
  categorias: Categoria[];
  cantidades: Record<string, number>;
}) {
  const [nueva, setNueva] = useState('');
  const { estado, guardar } = useGuardado();

  function crear() {
    const datos = categoriaSchema.safeParse({
      nombre: nueva,
      orden: siguienteOrden(categorias),
      visible: true,
      icono: 'set-meal',
    });
    if (!datos.success) return;
    void guardar(async () => {
      await guardarCategoria(null, datos.data);
      setNueva('');
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          crear();
        }}
      >
        <Input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Nueva categoría (ej.: Pizzas)"
          aria-label="Nombre de la nueva categoría"
        />
        <Button type="submit" disabled={nueva.trim().length === 0}>
          <Plus className="size-4" /> Agregar
        </Button>
      </form>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Arrastrá para cambiar el orden en la carta.</span>
        <IndicadorGuardado estado={estado} />
      </div>

      <ListaOrdenable
        items={categorias}
        onReordenar={(ids) => void guardar(() => reordenar('categorias', ids))}
        render={(c, manija) => {
          const cant = cantidades[c.id] ?? 0;
          return (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
              {manija}
              <label className="relative">
                <span className="sr-only">Ícono de {c.nombre}</span>
                <IconoCategoria
                  icono={c.icono}
                  className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
                />
                <select
                  value={c.icono ?? ''}
                  onChange={(e) =>
                    void guardar(() => actualizarCategoria(c.id, { icono: e.target.value }))
                  }
                  className="h-9 w-36 rounded-md border bg-transparent pr-2 pl-8 text-sm"
                >
                  {ICONOS_CATEGORIA.map((i) => (
                    <option key={i.clave} value={i.clave}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                defaultValue={c.nombre}
                aria-label="Nombre de la categoría"
                className="min-w-40 flex-1"
                onBlur={(e) => {
                  const nombre = e.target.value.trim();
                  if (nombre && nombre !== c.nombre)
                    void guardar(() => actualizarCategoria(c.id, { nombre }));
                }}
              />
              <span className="w-24 text-sm text-muted-foreground">
                {cant} producto{cant === 1 ? '' : 's'}
              </span>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={c.visible}
                  onCheckedChange={(v) =>
                    void guardar(() => actualizarCategoria(c.id, { visible: v }))
                  }
                />
                Visible
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Borrar ${c.nombre}`}
                title={cant > 0 ? 'Mové o borrá sus productos primero' : 'Borrar'}
                disabled={cant > 0}
                onClick={() => void guardar(() => eliminarCategoria(c.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        }}
      />
    </div>
  );
}
