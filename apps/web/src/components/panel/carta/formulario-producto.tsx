'use client';

/** Alta y edición de un producto (variantes, extras, foto, etiquetas, días, estación). */
import { Plus, Trash2 } from 'lucide-react';
import {
  ETIQUETAS_PRODUCTO,
  productoSchema,
  type CategoriaDatos,
  type EtiquetaProducto,
  type GrupoExtras,
  type ProductoDatos,
} from '@app/shared';
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
import { useFormulario } from '@/features/panel/formulario';
import { guardarProducto, nuevoId } from '@/features/panel/carta';
import { cn } from '@/lib/utils';
import { Campo, CampoImagen, IndicadorGuardado, InputPesos, useGuardado } from '../ui-panel';

const NOMBRE_ETIQUETA: Record<EtiquetaProducto, string> = {
  nuevo: 'Nuevo',
  picante: 'Picante',
  vegetariano: 'Vegetariano',
  sin_tacc: 'Sin TACC',
  recomendado: 'Recomendado',
};
const DIAS = [
  [1, 'L'],
  [2, 'M'],
  [3, 'X'],
  [4, 'J'],
  [5, 'V'],
  [6, 'S'],
  [0, 'D'],
] as const;

export type ProductoEditable = ProductoDatos & { id: string | null };

export function productoVacio(categoriaId: string, orden: number): ProductoEditable {
  return {
    id: null,
    categoriaId,
    nombre: '',
    descripcion: '',
    precio: 0,
    orden,
    visible: true,
    disponible: true,
    estacion: 'cocina',
  };
}

interface Props {
  producto: ProductoEditable | null;
  categorias: (CategoriaDatos & { id: string })[];
  onCerrar: () => void;
}

export function FormularioProducto({ producto, categorias, onCerrar }: Props) {
  return (
    <Dialog open={producto !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {producto && (
          <Contenido
            key={producto.id ?? 'nuevo'}
            producto={producto}
            categorias={categorias}
            onCerrar={onCerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Contenido({ producto, categorias, onCerrar }: Props & { producto: ProductoEditable }) {
  const { id, ...inicial } = producto;
  const f = useFormulario(productoSchema, inicial);
  const { estado, guardar, guardando } = useGuardado();
  const v = f.valor;
  const variantes = v.variantes ?? [];
  const grupos = v.gruposExtras ?? [];
  const tieneAvanzado = Boolean(
    inicial.variantes?.length ||
    inicial.gruposExtras?.length ||
    inicial.etiquetas?.length ||
    inicial.diasDisponible?.length ||
    !inicial.visible ||
    inicial.estacion === 'barra',
  );

  async function enviar() {
    // Con variantes, el precio "base" es el menor (se usa en listados y en la vista previa de precios).
    const datos = f.validar();
    if (!datos) return;
    if (datos.variantes?.length) datos.precio = Math.min(...datos.variantes.map((x) => x.precio));
    if (await guardar(() => guardarProducto(id, datos))) onCerrar();
  }

  const setGrupo = (i: number, g: Partial<GrupoExtras>) =>
    f.cambiar(
      'gruposExtras',
      grupos.map((x, j) => (j === i ? { ...x, ...g } : x)),
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{id ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        <DialogDescription>
          Los cambios se ven en la web a los pocos segundos de guardar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[1fr_200px]">
        <div className="space-y-4">
          <Campo etiqueta="Nombre" error={f.errores.nombre}>
            {(id) => (
              <Input
                id={id}
                value={v.nombre}
                onChange={(e) => f.cambiar('nombre', e.target.value)}
              />
            )}
          </Campo>
          <Campo etiqueta="Descripción" error={f.errores.descripcion}>
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={v.descripcion}
                onChange={(e) => f.cambiar('descripcion', e.target.value)}
              />
            )}
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Categoría" error={f.errores.categoriaId}>
              {(id) => (
                <select
                  id={id}
                  value={v.categoriaId}
                  onChange={(e) => f.cambiar('categoriaId', e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            {variantes.length === 0 ? (
              <Campo
                etiqueta="Precio"
                error={f.errores.precio}
                ayuda="En 0 se muestra “Consultar”."
              >
                {(id) => (
                  <InputPesos id={id} valor={v.precio} onCambio={(n) => f.cambiar('precio', n)} />
                )}
              </Campo>
            ) : (
              <p className="self-end pb-2 text-sm text-muted-foreground">
                El precio sale de las variantes.
              </p>
            )}
          </div>
        </div>
        <CampoImagen
          etiqueta="Foto"
          valor={v.fotoUrl}
          onCambio={(url) => f.cambiar('fotoUrl', url || undefined)}
          carpeta="productos"
          aspecto="aspect-[16/9] md:aspect-square"
          ayuda="Sin foto, la web muestra el ícono de la categoría."
        />
      </div>

      <label className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
        <Switch checked={v.disponible} onCheckedChange={(c) => f.cambiar('disponible', c)} />
        {v.disponible ? 'Disponible' : 'Agotado'}
      </label>

      {/* Lo que se usa poco va plegado: el alta básica es nombre, precio y foto. */}
      <details className="rounded-lg border p-3" open={tieneAvanzado}>
        <summary className="cursor-pointer text-sm font-medium">
          Más opciones{' '}
          <span className="font-normal text-muted-foreground">
            (variantes, extras, etiquetas, días…)
          </span>
        </summary>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={v.visible} onCheckedChange={(c) => f.cambiar('visible', c)} />{' '}
              Visible en la carta
            </label>
            <label className="flex items-center gap-2 text-sm">
              Se prepara en
              <select
                value={v.estacion}
                onChange={(e) => f.cambiar('estacion', e.target.value as ProductoDatos['estacion'])}
                className="h-8 rounded-md border bg-transparent px-2"
              >
                <option value="cocina">Cocina</option>
                <option value="barra">Barra</option>
              </select>
            </label>
          </div>

          {/* Variantes */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Variantes</legend>
            <p className="text-xs text-muted-foreground">
              Ej.: Napolitana / A caballo, Simple / Doble. El cliente elige una.
            </p>
            {variantes.map((x, i) => (
              <div key={x.id} className="flex gap-2">
                <Input
                  aria-label="Nombre de la variante"
                  placeholder="Nombre"
                  value={x.nombre}
                  onChange={(e) =>
                    f.cambiar(
                      'variantes',
                      variantes.map((y, j) => (j === i ? { ...y, nombre: e.target.value } : y)),
                    )
                  }
                />
                <div className="w-36 shrink-0">
                  <InputPesos
                    valor={x.precio}
                    onCambio={(n) =>
                      f.cambiar(
                        'variantes',
                        variantes.map((y, j) => (j === i ? { ...y, precio: n } : y)),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar variante"
                  onClick={() =>
                    f.cambiar(
                      'variantes',
                      variantes.filter((_, j) => j !== i).length
                        ? variantes.filter((_, j) => j !== i)
                        : undefined,
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
                f.cambiar('variantes', [
                  ...variantes,
                  { id: nuevoId(), nombre: '', precio: v.precio },
                ])
              }
            >
              <Plus className="size-4" /> Agregar variante
            </Button>
            {Object.entries(f.errores).some(([k]) => k.startsWith('variantes')) && (
              <p className="text-sm text-destructive">
                Revisá las variantes: cada una necesita nombre.
              </p>
            )}
          </fieldset>

          {/* Extras */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Extras y guarniciones</legend>
            <p className="text-xs text-muted-foreground">
              Ej.: “Guarnición” (elegí 1) o “Agregados” (hasta 3). Mínimo 1 = obligatorio.
            </p>
            {grupos.map((g, i) => (
              <div key={g.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1"
                    aria-label="Nombre del grupo"
                    placeholder="Nombre del grupo"
                    value={g.nombre}
                    onChange={(e) => setGrupo(i, { nombre: e.target.value })}
                  />
                  <label className="flex items-center gap-1 text-sm">
                    Mín
                    <Input
                      type="number"
                      min={0}
                      className="w-16"
                      value={g.min}
                      onChange={(e) => setGrupo(i, { min: Math.max(0, Number(e.target.value)) })}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    Máx
                    <Input
                      type="number"
                      min={1}
                      className="w-16"
                      value={g.max}
                      onChange={(e) => setGrupo(i, { max: Math.max(1, Number(e.target.value)) })}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar grupo"
                    onClick={() =>
                      f.cambiar(
                        'gruposExtras',
                        grupos.filter((_, j) => j !== i).length
                          ? grupos.filter((_, j) => j !== i)
                          : undefined,
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {g.opciones.map((o, k) => (
                  <div key={o.id} className="flex items-center gap-2 pl-3">
                    <Input
                      aria-label="Opción"
                      placeholder="Opción"
                      value={o.nombre}
                      onChange={(e) =>
                        setGrupo(i, {
                          opciones: g.opciones.map((p, m) =>
                            m === k ? { ...p, nombre: e.target.value } : p,
                          ),
                        })
                      }
                    />
                    <div className="w-32 shrink-0">
                      <InputPesos
                        valor={o.precio}
                        placeholder="Sin cargo"
                        onCambio={(n) =>
                          setGrupo(i, {
                            opciones: g.opciones.map((p, m) => (m === k ? { ...p, precio: n } : p)),
                          })
                        }
                      />
                    </div>
                    <Switch
                      aria-label="Disponible"
                      checked={o.disponible}
                      onCheckedChange={(c) =>
                        setGrupo(i, {
                          opciones: g.opciones.map((p, m) =>
                            m === k ? { ...p, disponible: c } : p,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar opción"
                      disabled={g.opciones.length === 1}
                      onClick={() =>
                        setGrupo(i, { opciones: g.opciones.filter((_, m) => m !== k) })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setGrupo(i, {
                      opciones: [
                        ...g.opciones,
                        { id: nuevoId(), nombre: '', precio: 0, disponible: true },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" /> Opción
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                f.cambiar('gruposExtras', [
                  ...grupos,
                  {
                    id: nuevoId(),
                    nombre: '',
                    min: 0,
                    max: 1,
                    opciones: [{ id: nuevoId(), nombre: '', precio: 0, disponible: true }],
                  },
                ])
              }
            >
              <Plus className="size-4" /> Agregar grupo de extras
            </Button>
            {Object.entries(f.errores).some(([k]) => k.startsWith('gruposExtras')) && (
              <p className="text-sm text-destructive">
                Revisá los extras: nombres completos y mínimo ≤ máximo.
              </p>
            )}
          </fieldset>

          {/* Etiquetas y días */}
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Etiquetas</legend>
              <div className="flex flex-wrap gap-1.5">
                {ETIQUETAS_PRODUCTO.map((e) => {
                  const on = v.etiquetas?.includes(e) ?? false;
                  return (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const lista = on
                          ? (v.etiquetas ?? []).filter((x) => x !== e)
                          : [...(v.etiquetas ?? []), e];
                        f.cambiar('etiquetas', lista.length ? lista : undefined);
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      {NOMBRE_ETIQUETA[e]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Días que se ofrece</legend>
              <div className="flex gap-1">
                {DIAS.map(([d, letra]) => {
                  const on = v.diasDisponible?.includes(d) ?? false;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const lista = on
                          ? (v.diasDisponible ?? []).filter((x) => x !== d)
                          : [...(v.diasDisponible ?? []), d];
                        f.cambiar('diasDisponible', lista.length ? lista : undefined);
                      }}
                      className={cn(
                        'size-8 rounded-full border text-xs font-medium',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sin marcar = todos los días (útil para viandas del día).
              </p>
            </fieldset>
          </div>
        </div>
      </details>

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
