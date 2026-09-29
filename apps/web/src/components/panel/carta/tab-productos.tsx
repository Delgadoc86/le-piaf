'use client';

/** Lista de productos por categoría: agotado con un toque, visible, editar, duplicar, borrar y ordenar. */
import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Copy, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { formatARS, type CategoriaDatos, type ProductoDatos } from '@app/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  alternarDisponible,
  eliminarProducto,
  reordenar,
  siguienteOrden,
} from '@/features/panel/carta';
import { IconoCategoria } from '@/components/publico/tienda/ilustracion';
import { FormularioProducto, productoVacio, type ProductoEditable } from './formulario-producto';
import { ListaOrdenable, useGuardado, IndicadorGuardado } from '../ui-panel';

type Producto = ProductoDatos & { id: string };
type Categoria = CategoriaDatos & { id: string };

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function TabProductos({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<ProductoEditable | null>(null);
  const [borrando, setBorrando] = useState<Producto | null>(null);
  const { estado, guardar } = useGuardado();

  const grupos = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return categorias.map((c) => ({
      categoria: c,
      productos: productos.filter(
        (p) =>
          p.categoriaId === c.id && (!q || normalizar(`${p.nombre} ${p.descripcion}`).includes(q)),
      ),
    }));
  }, [busqueda, categorias, productos]);

  const huerfanos = productos.filter((p) => !categorias.some((c) => c.id === p.categoriaId));

  function duplicar(p: Producto) {
    setEditando({
      ...p,
      id: null,
      nombre: `${p.nombre} (copia)`,
      orden: siguienteOrden(productos),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className="pl-9"
            aria-label="Buscar producto"
          />
        </div>
        <IndicadorGuardado estado={estado} />
        <Button
          onClick={() =>
            setEditando(productoVacio(categorias[0]?.id ?? '', siguienteOrden(productos)))
          }
          disabled={categorias.length === 0}
        >
          <Plus className="size-4" /> Nuevo producto
        </Button>
      </div>

      {categorias.length === 0 && (
        <p className="text-muted-foreground">
          Primero creá una categoría en la pestaña Categorías.
        </p>
      )}

      {grupos.map(({ categoria, productos: lista }) =>
        lista.length === 0 && busqueda ? null : (
          <section key={categoria.id} aria-labelledby={`g-${categoria.id}`}>
            <h2 id={`g-${categoria.id}`} className="mb-2 flex items-center gap-2 font-semibold">
              <IconoCategoria icono={categoria.icono} className="size-4 text-muted-foreground" />
              {categoria.nombre}
              <span className="text-sm font-normal text-muted-foreground">({lista.length})</span>
              {!categoria.visible && <Badge variant="outline">Oculta</Badge>}
            </h2>
            {lista.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sin productos.{' '}
                <button
                  className="underline"
                  onClick={() =>
                    setEditando(productoVacio(categoria.id, siguienteOrden(productos)))
                  }
                >
                  Agregar uno
                </button>
              </p>
            ) : (
              <ListaOrdenable
                items={lista}
                onReordenar={(ids) => void guardar(() => reordenar('productos', ids))}
                render={(p, manija) => (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-2 pr-3">
                    {busqueda ? <span className="w-6" /> : manija}
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.fotoUrl ? (
                        <Image src={p.fotoUrl} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <IconoCategoria
                          icono={categoria.icono}
                          className="absolute inset-0 m-auto size-5 text-muted-foreground"
                        />
                      )}
                    </div>
                    <button
                      className="min-w-0 flex-1 basis-40 text-left"
                      onClick={() => setEditando({ ...p })}
                    >
                      <p className="truncate font-medium">
                        {p.nombre}{' '}
                        {!p.visible && (
                          <EyeOff
                            className="inline size-3.5 text-muted-foreground"
                            aria-label="Oculto"
                          />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {p.variantes?.length
                          ? p.variantes.map((v) => `${v.nombre} ${formatARS(v.precio)}`).join(' · ')
                          : p.precio > 0
                            ? formatARS(p.precio)
                            : 'Consultar'}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 max-sm:w-full max-sm:justify-between max-sm:border-t max-sm:pt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <span
                          className={
                            p.disponible ? 'text-muted-foreground' : 'font-medium text-destructive'
                          }
                        >
                          {p.disponible ? 'Disponible' : 'Agotado'}
                        </span>
                        <Switch
                          checked={p.disponible}
                          onCheckedChange={(c) => void guardar(() => alternarDisponible(p.id, c))}
                          aria-label={`${p.nombre} disponible`}
                        />
                      </label>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${p.nombre}`}
                          onClick={() => setEditando({ ...p })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Duplicar ${p.nombre}`}
                          onClick={() => duplicar(p)}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Borrar ${p.nombre}`}
                          onClick={() => setBorrando(p)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </section>
        ),
      )}

      {huerfanos.length > 0 && (
        <p className="text-sm text-destructive">
          {huerfanos.length} producto(s) apuntan a una categoría que ya no existe:{' '}
          {huerfanos.map((p) => p.nombre).join(', ')}. Editalos para asignarles una.
        </p>
      )}

      <FormularioProducto
        producto={editando}
        categorias={categorias}
        onCerrar={() => setEditando(null)}
      />

      <AlertDialog open={borrando !== null} onOpenChange={(a) => !a && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar “{borrando?.nombre}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Desaparece de la carta. Si solo no lo tenés hoy, mejor marcalo como agotado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (borrando) void guardar(() => eliminarProducto(borrando.id));
                setBorrando(null);
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
