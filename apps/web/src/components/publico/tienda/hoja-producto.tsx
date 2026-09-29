'use client';

/**
 * Hoja de producto (bottom sheet en celular, modal en escritorio): variante, extras (respeta
 * mín/máx), nota y cantidad. El precio se calcula en vivo con calcularItem (packages/shared).
 */
import { useMemo, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Check, Minus, Plus, X } from 'lucide-react';
import { calcularItem, ErrorPrecio, formatARS, resumirDias, type GrupoExtras } from '@app/shared';
import { useCarrito, useTiendaUI } from '@/features/carrito/store';
import { useTienda } from '@/features/carrito/tienda';
import { cn } from '@/lib/utils';
import { Miniatura } from './ilustracion';

export function HojaProducto() {
  const id = useTiendaUI((e) => e.producto);
  const cerrar = useTiendaUI((e) => e.abrirProducto);
  const { producto } = useTienda();
  const p = id ? producto(id) : undefined;

  return (
    <Dialog.Root open={Boolean(p)} onOpenChange={(abierta) => !abierta && cerrar(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="velo fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="hoja hoja-centro fixed font-texto text-tinta inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] border border-borde bg-superficie md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[min(560px,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px]"
        >
          {p && <Contenido key={p.id} productoId={p.id} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Contenido({ productoId }: { productoId: string }) {
  const { producto, categoria } = useTienda();
  const p = producto(productoId)!;
  const agregar = useCarrito((e) => e.agregar);
  const { abrirProducto, avisarAgregado } = useTiendaUI();

  const variantes = p.variantes ?? [];
  const grupos = p.gruposExtras ?? [];
  const [varianteId, setVarianteId] = useState<string | undefined>(variantes[0]?.id);
  const [extras, setExtras] = useState<Record<string, string[]>>({});
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [agregado, setAgregado] = useState(false);

  const seleccionExtras = Object.entries(extras).flatMap(([grupoId, ops]) =>
    ops.map((opcionId) => ({ grupoId, opcionId })),
  );

  const calculo = useMemo(() => {
    try {
      return {
        ok: true as const,
        linea: calcularItem(p, { varianteId, extras: seleccionExtras, cantidad, nota: nota.trim() || undefined }),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof ErrorPrecio ? e.message : 'Revisá las opciones' };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seleccionExtras se deriva de extras
  }, [p, varianteId, extras, cantidad, nota]);

  function alternarExtra(g: GrupoExtras, opcionId: string) {
    setExtras((prev) => {
      const actuales = prev[g.id] ?? [];
      if (actuales.includes(opcionId)) return { ...prev, [g.id]: actuales.filter((o) => o !== opcionId) };
      // Grupo de una sola opción: se comporta como radio.
      if (g.max === 1) return { ...prev, [g.id]: [opcionId] };
      if (actuales.length >= g.max) return prev;
      return { ...prev, [g.id]: [...actuales, opcionId] };
    });
  }

  function confirmar() {
    if (!calculo.ok) return;
    agregar({
      tipo: 'producto',
      productoId: p.id,
      ...(varianteId ? { varianteId } : {}),
      extras: seleccionExtras,
      cantidad,
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    avisarAgregado();
    setAgregado(true);
    setTimeout(() => abrirProducto(null), 450);
  }

  const agotado = !p.disponible;
  const cat = categoria(p.categoriaId);

  return (
    <>
      <div className="relative shrink-0">
        <Miniatura
          fotoUrl={p.fotoUrl}
          alt={p.nombre}
          icono={cat?.icono}
          sizes="(min-width: 768px) 560px, 100vw"
          className="aspect-[16/9] md:aspect-[2/1]"
          iconoClassName="size-20"
        />
        <div className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/40 md:hidden" aria-hidden />
        <Dialog.Close
          aria-label="Cerrar"
          className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md transition-colors hover:bg-black/80"
        >
          <X className="size-5" aria-hidden />
        </Dialog.Close>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pt-5 pb-4 md:px-7">
        <div>
          <Dialog.Title className="text-2xl font-semibold">{p.nombre}</Dialog.Title>
          {p.descripcion && <p className="mt-2 text-tinta-2">{p.descripcion}</p>}
          {p.diasDisponible && p.diasDisponible.length > 0 && p.diasDisponible.length < 7 && (
            <p className="mt-2 text-sm text-marca">Solo {resumirDias(p.diasDisponible)}</p>
          )}
        </div>

        {variantes.length > 0 && (
          <fieldset>
            <legend className="mb-3 flex w-full items-center justify-between font-semibold">
              Elegí una opción
              <span className="rounded-full bg-marca/15 px-2 py-0.5 text-[11px] font-semibold text-marca">Obligatorio</span>
            </legend>
            <div className="space-y-2">
              {variantes.map((v) => (
                <Opcion
                  key={v.id}
                  tipo="radio"
                  nombre={`variante-${p.id}`}
                  marcada={varianteId === v.id}
                  onCambio={() => setVarianteId(v.id)}
                  etiqueta={v.nombre}
                  precio={formatARS(v.precio)}
                />
              ))}
            </div>
          </fieldset>
        )}

        {grupos.map((g) => {
          const elegidas = extras[g.id] ?? [];
          return (
            <fieldset key={g.id}>
              <legend className="mb-3 flex w-full items-center justify-between font-semibold">
                {g.nombre}
                <span className="text-xs font-normal text-tinta-2">
                  {g.min > 0 ? `Elegí ${g.min === g.max ? g.min : `${g.min} a ${g.max}`}` : `Hasta ${g.max}`}
                </span>
              </legend>
              <div className="space-y-2">
                {g.opciones.map((o) => (
                  <Opcion
                    key={o.id}
                    tipo={g.max === 1 ? 'radio' : 'checkbox'}
                    nombre={`grupo-${g.id}`}
                    marcada={elegidas.includes(o.id)}
                    deshabilitada={!o.disponible || (!elegidas.includes(o.id) && g.max > 1 && elegidas.length >= g.max)}
                    onCambio={() => alternarExtra(g, o.id)}
                    etiqueta={o.nombre}
                    precio={!o.disponible ? 'Agotado' : o.precio > 0 ? `+ ${formatARS(o.precio)}` : 'Sin cargo'}
                  />
                ))}
              </div>
            </fieldset>
          );
        })}

        <label className="block">
          <span className="mb-2 block font-semibold">
            ¿Algo para aclarar? <span className="font-normal text-tinta-2">(opcional)</span>
          </span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Ej.: sin cebolla, bien cocido…"
            className="w-full resize-none rounded-2xl border border-borde bg-fondo/50 px-4 py-3 text-base placeholder:text-tinta-2/60 focus:border-marca/60 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-borde bg-superficie px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-7">
        <Contador valor={cantidad} onCambio={setCantidad} />
        <button
          type="button"
          onClick={confirmar}
          disabled={agotado || !calculo.ok || agregado}
          className="brillo relative inline-flex h-13 flex-1 items-center justify-between gap-3 rounded-full bg-marca px-6 font-semibold text-black transition-[background-color,opacity] hover:bg-marca-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {agregado ? (
            <span className="tilde mx-auto inline-flex items-center gap-2">
              <Check className="size-5" aria-hidden /> Agregado
            </span>
          ) : agotado ? (
            <span className="mx-auto">Agotado</span>
          ) : !calculo.ok ? (
            <span className="mx-auto truncate text-sm">{calculo.error}</span>
          ) : (
            <>
              <span>Agregar</span>
              <span className="tabular-nums">{formatARS(calculo.linea.subtotal)}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

function Opcion(props: {
  tipo: 'radio' | 'checkbox';
  nombre: string;
  marcada: boolean;
  deshabilitada?: boolean;
  onCambio: () => void;
  etiqueta: string;
  precio: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
        props.marcada ? 'border-marca bg-marca/8' : 'border-borde hover:border-white/20',
        props.deshabilitada && 'cursor-not-allowed opacity-45',
      )}
    >
      <input
        type={props.tipo}
        name={props.nombre}
        checked={props.marcada}
        disabled={props.deshabilitada}
        onChange={props.onCambio}
        className="size-5 accent-[var(--marca-primario)]"
      />
      <span className="flex-1">{props.etiqueta}</span>
      <span className="text-sm text-tinta-2 tabular-nums">{props.precio}</span>
    </label>
  );
}

export function Contador({
  valor,
  onCambio,
  min = 1,
  chico = false,
}: {
  valor: number;
  onCambio: (n: number) => void;
  min?: number;
  chico?: boolean;
}) {
  const boton = cn(
    'inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30',
    chico ? 'size-8' : 'size-11',
  );
  return (
    <div className={cn('inline-flex items-center rounded-full border border-borde', chico ? 'h-9' : 'h-13')}>
      <button type="button" aria-label="Menos" className={boton} disabled={valor <= min} onClick={() => onCambio(valor - 1)}>
        <Minus className="size-4" aria-hidden />
      </button>
      <span className={cn('text-center font-semibold tabular-nums', chico ? 'w-6 text-sm' : 'w-8')} aria-live="polite">
        {valor}
      </span>
      <button type="button" aria-label="Más" className={boton} disabled={valor >= 99} onClick={() => onCambio(valor + 1)}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
