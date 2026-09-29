'use client';

/** Piezas comunes del panel: encabezado, campos, imagen, precio, guardado y lista ordenable. */
import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { subirImagen, TIPOS_IMAGEN } from '@/features/panel/imagenes';
import { mensajeError } from '@/features/panel/firestore';

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {descripcion && <p className="mt-1 text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

export function Bloque({
  titulo,
  descripcion,
  children,
  className,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-5', className)}>
      <h2 className="font-semibold">{titulo}</h2>
      {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Etiqueta + control + error/ayuda. El control recibe el id por render prop. */
export function Campo({
  etiqueta,
  error,
  ayuda,
  className,
  children,
}: {
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children(id)}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>
      )}
    </div>
  );
}

/** Precio en pesos enteros: solo dígitos, muestra separador de miles. */
export function InputPesos({
  id,
  valor,
  onCambio,
  placeholder,
}: {
  id?: string;
  valor: number;
  onCambio: (n: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-7 tabular-nums"
        placeholder={placeholder ?? '0'}
        value={valor ? valor.toLocaleString('es-AR') : ''}
        onChange={(e) => onCambio(Number(e.target.value.replace(/\D/g, '').slice(0, 9)) || 0)}
      />
    </div>
  );
}

/** Imagen con vista previa: sube comprimida a Storage y devuelve la URL. */
export function CampoImagen({
  etiqueta,
  valor,
  onCambio,
  carpeta,
  aspecto = 'aspect-[4/3]',
  ayuda,
}: {
  etiqueta: string;
  valor: string | undefined;
  onCambio: (url: string) => void;
  carpeta: string;
  aspecto?: string;
  ayuda?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      onCambio(await subirImagen(archivo, carpeta));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{etiqueta}</Label>
      <div className={cn('group relative overflow-hidden rounded-lg border bg-muted', aspecto)}>
        {valor ? (
          <Image src={valor} alt="" fill sizes="400px" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
            <ImagePlus className="size-6" aria-hidden />
            Sin foto
          </div>
        )}
        {subiendo && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin" aria-label="Subiendo" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => input.current?.click()}
          disabled={subiendo}
        >
          <ImagePlus className="size-4" aria-hidden /> {valor ? 'Cambiar' : 'Subir foto'}
        </Button>
        {valor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCambio('')}
            disabled={subiendo}
          >
            <Trash2 className="size-4" aria-hidden /> Quitar
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TIPOS_IMAGEN}
        className="hidden"
        onChange={(e) => void elegir(e.target.files?.[0])}
      />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>
      )}
    </div>
  );
}

type EstadoGuardado =
  { tipo: 'nada' } | { tipo: 'guardando' } | { tipo: 'ok' } | { tipo: 'error'; mensaje: string };

/** Ejecuta un guardado y expone su estado para <IndicadorGuardado>. */
export function useGuardado() {
  const [estado, setEstado] = useState<EstadoGuardado>({ tipo: 'nada' });
  const guardar = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setEstado({ tipo: 'guardando' });
    try {
      await fn();
      setEstado({ tipo: 'ok' });
      setTimeout(() => setEstado((e) => (e.tipo === 'ok' ? { tipo: 'nada' } : e)), 2500);
      return true;
    } catch (e) {
      setEstado({ tipo: 'error', mensaje: mensajeError(e) });
      return false;
    }
  }, []);
  return { estado, guardar, guardando: estado.tipo === 'guardando' };
}

export function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  if (estado.tipo === 'nada') return null;
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        estado.tipo === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {estado.tipo === 'guardando' && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {estado.tipo === 'ok' && <Check className="size-4 text-emerald-600" aria-hidden />}
      {estado.tipo === 'guardando'
        ? 'Guardando…'
        : estado.tipo === 'ok'
          ? 'Guardado'
          : estado.mensaje}
    </span>
  );
}

/** Lista ordenable arrastrando (mouse, dedo o teclado: espacio + flechas). */
export function ListaOrdenable<T extends { id: string }>({
  items,
  onReordenar,
  render,
}: {
  items: T[];
  onReordenar: (ids: string[]) => void;
  render: (item: T, manija: ReactNode) => ReactNode;
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function alSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = items.map((i) => i.id);
    onReordenar(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  }
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((item) => (
            <FilaOrdenable key={item.id} id={item.id}>
              {(manija) => render(item, manija)}
            </FilaOrdenable>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function FilaOrdenable({
  id,
  children,
}: {
  id: string;
  children: (manija: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const manija = (
    <button
      type="button"
      aria-label="Arrastrar para ordenar"
      className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      {children(manija)}
    </li>
  );
}
