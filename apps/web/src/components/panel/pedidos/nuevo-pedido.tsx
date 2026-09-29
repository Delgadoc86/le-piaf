'use client';

/**
 * Carga rápida de pedidos de mostrador o teléfono. Arma la selección igual que el carrito de la web
 * y la manda a crearPedido, que recalcula los precios en el servidor.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, Search, Trash2 } from 'lucide-react';
import {
  calcularItem,
  calcularItemPromo,
  formatARS,
  type CategoriaDatos,
  type ConfigPedidos,
  type LineaCalculada,
  type MedioPagoManual,
  type OrigenManual,
  type ProductoDatos,
  type PromoDatos,
  type SeleccionItem,
  type TipoPedido,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useColeccion, mensajeError } from '@/features/panel/firestore';
import { crearPedidoManual, ETIQUETA_TIPO } from '@/features/panel/pedidos';
import { normalizarTelefonoAR } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type ProductoConId = ProductoDatos & { id: string };
interface Linea {
  clave: string;
  seleccion: SeleccionItem;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (numero: number) => void;
  tipos: ConfigPedidos['tipos'];
}

export function NuevoPedido({ abierto, onCerrar, onCreado, tipos }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl">
        {abierto && <Contenido tipos={tipos} onCreado={onCreado} />}
      </DialogContent>
    </Dialog>
  );
}

/** Misma elección sin contar la cantidad = misma línea. */
function claveDe(s: SeleccionItem): string {
  return JSON.stringify({ ...s, cantidad: 0 });
}

function Contenido({ tipos, onCreado }: Pick<Props, 'tipos' | 'onCreado'>) {
  const productos = useColeccion<ProductoDatos>('productos');
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const promos = useColeccion<PromoDatos>('promos');

  const [busqueda, setBusqueda] = useState('');
  const [configurando, setConfigurando] = useState<ProductoConId | null>(null);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tipo, setTipo] = useState<TipoPedido>('take_away');
  const [origen, setOrigen] = useState<OrigenManual>('mostrador');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [medio, setMedio] = useState<MedioPagoManual>('efectivo');
  const [pagado, setPagado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porId = useMemo(
    () => ({
      productos: new Map(productos.datos.map((p) => [p.id, p])),
      promos: new Map(promos.datos.map((p) => [p.id, p])),
    }),
    [productos.datos, promos.datos],
  );

  // Precios para mostrar (el servidor recalcula igual). Sin validar agotados: el staff decide.
  const calculadas = lineas.map((l) => {
    const s = l.seleccion;
    try {
      if (s.tipo === 'producto') {
        const p = porId.productos.get(s.productoId);
        return p ? calcularItem(p, s, { validarDisponibilidad: false }) : null;
      }
      const p = porId.promos.get(s.promoId);
      return p ? calcularItemPromo(p, s, { validarDisponibilidad: false }) : null;
    } catch {
      return null;
    }
  });
  const total = calculadas.reduce((t, c) => t + (c?.subtotal ?? 0), 0);

  function agregar(s: SeleccionItem) {
    const clave = claveDe(s);
    setLineas((ls) =>
      ls.some((l) => l.clave === clave)
        ? ls.map((l) =>
            l.clave === clave
              ? {
                  ...l,
                  seleccion: {
                    ...l.seleccion,
                    cantidad: Math.min(99, l.seleccion.cantidad + s.cantidad),
                  },
                }
              : l,
          )
        : [...ls, { clave, seleccion: s }],
    );
  }

  function cambiarCantidad(clave: string, cantidad: number) {
    setLineas((ls) =>
      cantidad <= 0
        ? ls.filter((l) => l.clave !== clave)
        : ls.map((l) =>
            l.clave === clave ? { ...l, seleccion: { ...l.seleccion, cantidad } } : l,
          ),
    );
  }

  function tocarProducto(p: ProductoConId) {
    if ((p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.length ?? 0) > 0) setConfigurando(p);
    else agregar({ tipo: 'producto', productoId: p.id, extras: [], cantidad: 1 });
  }

  const texto = busqueda.trim().toLowerCase();
  const grupos = categorias.datos
    .map((c) => ({
      categoria: c,
      productos: productos.datos.filter(
        (p) => p.categoriaId === c.id && (!texto || p.nombre.toLowerCase().includes(texto)),
      ),
    }))
    .filter((g) => g.productos.length > 0);
  const promosVisibles = promos.datos.filter(
    (p) => p.activa && (!texto || p.titulo.toLowerCase().includes(texto)),
  );

  const tiposDisponibles: TipoPedido[] = [
    'take_away',
    'salon',
    ...(tipos.delivery ? (['delivery'] as const) : []),
  ];
  const telefonoNormal = telefono.trim() ? normalizarTelefonoAR(telefono) : undefined;
  const telefonoInvalido = telefonoNormal === null;
  const faltaDireccion = tipo === 'delivery' && direccion.trim().length < 3;
  const puedeEnviar =
    lineas.length > 0 &&
    calculadas.every((c) => c !== null) &&
    !telefonoInvalido &&
    !faltaDireccion &&
    !enviando;

  async function enviar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await crearPedidoManual({
        origen,
        tipo,
        ...(nombre.trim() || telefonoNormal
          ? {
              cliente: {
                nombre: nombre.trim(),
                ...(telefonoNormal ? { telefono: telefonoNormal } : {}),
              },
            }
          : {}),
        ...(tipo === 'delivery' ? { entrega: { direccion: direccion.trim() } } : {}),
        items: lineas.map((l) => l.seleccion),
        pago: { medio },
        pagado,
      });
      onCreado(r.numero);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nuevo pedido</DialogTitle>
        <DialogDescription>
          Para pedidos de mostrador o por teléfono. Entra directo a preparación.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[1fr_340px]">
        {/* Carta */}
        <section className="min-w-0 space-y-3">
          {configurando ? (
            <ConfigurarProducto
              producto={configurando}
              onVolver={() => setConfigurando(null)}
              onAgregar={(s) => {
                agregar(s);
                setConfigurando(null);
              }}
            />
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en la carta…"
                  className="pl-9"
                  aria-label="Buscar en la carta"
                />
              </div>
              <div className="max-h-[50dvh] space-y-4 overflow-y-auto pr-1 md:max-h-[60dvh]">
                {promosVisibles.length > 0 && (
                  <GrupoBotones titulo="Promos">
                    {promosVisibles.map((p) => (
                      <BotonItem
                        key={p.id}
                        nombre={p.titulo}
                        precio={p.precio}
                        onClick={() => agregar({ tipo: 'promo', promoId: p.id, cantidad: 1 })}
                      />
                    ))}
                  </GrupoBotones>
                )}
                {grupos.map((g) => (
                  <GrupoBotones key={g.categoria.id} titulo={g.categoria.nombre}>
                    {g.productos.map((p) => (
                      <BotonItem
                        key={p.id}
                        nombre={p.nombre}
                        precio={p.precio}
                        agotado={!p.disponible}
                        conOpciones={
                          (p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.length ?? 0) > 0
                        }
                        onClick={() => tocarProducto(p)}
                      />
                    ))}
                  </GrupoBotones>
                ))}
                {grupos.length === 0 && promosVisibles.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No hay resultados.
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* Ticket y datos */}
        <section className="space-y-4 rounded-xl border bg-muted/30 p-3">
          {lineas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tocá productos para sumarlos.
            </p>
          ) : (
            <ul className="divide-y">
              {lineas.map((l, n) => {
                const c: LineaCalculada | null | undefined = calculadas[n];
                return (
                  <li key={l.clave} className="flex items-center gap-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {c?.nombre ?? 'No disponible'}
                        {c?.varianteNombre && (
                          <span className="text-muted-foreground"> · {c.varianteNombre}</span>
                        )}
                      </p>
                      {c && c.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {c.extras.map((e) => e.nombre).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Uno menos"
                        onClick={() => cambiarCantidad(l.clave, l.seleccion.cantidad - 1)}
                      >
                        {l.seleccion.cantidad === 1 ? <Trash2 /> : <Minus />}
                      </Button>
                      <span className="w-6 text-center tabular-nums">{l.seleccion.cantidad}</span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Uno más"
                        onClick={() =>
                          cambiarCantidad(l.clave, Math.min(99, l.seleccion.cantidad + 1))
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                    <span className="w-20 text-right tabular-nums">
                      {c ? formatARS(c.subtotal) : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <Chips
            etiqueta="Entrega"
            opciones={tiposDisponibles.map((t) => ({ valor: t, texto: ETIQUETA_TIPO[t] }))}
            valor={tipo}
            onCambio={(v) => setTipo(v as TipoPedido)}
          />
          <Chips
            etiqueta="Origen"
            opciones={[
              { valor: 'mostrador', texto: 'Mostrador' },
              { valor: 'telefono', texto: 'Teléfono' },
            ]}
            valor={origen}
            onCambio={(v) => setOrigen(v as OrigenManual)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="np-nombre">Nombre</Label>
              <Input
                id="np-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.slice(0, 60))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="np-tel">WhatsApp</Label>
              <Input
                id="np-tel"
                value={telefono}
                inputMode="tel"
                onChange={(e) => setTelefono(e.target.value.slice(0, 25))}
                placeholder="Opcional"
                aria-invalid={telefonoInvalido || undefined}
              />
            </div>
          </div>
          {tipo === 'delivery' && (
            <div className="space-y-1">
              <Label htmlFor="np-dir">Dirección</Label>
              <Input
                id="np-dir"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value.slice(0, 200))}
              />
            </div>
          )}
          <Chips
            etiqueta="Pago"
            opciones={[
              { valor: 'efectivo', texto: 'Efectivo' },
              { valor: 'transferencia', texto: 'Transferencia' },
            ]}
            valor={medio}
            onCambio={(v) => setMedio(v as MedioPagoManual)}
          />
          <label className="flex items-center justify-between gap-2 text-sm font-medium">
            Ya pagó
            <Switch checked={pagado} onCheckedChange={setPagado} />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="h-11 w-full text-base"
            onClick={() => void enviar()}
            disabled={!puedeEnviar}
          >
            {enviando ? 'Cargando…' : `Cargar pedido · ${formatARS(total)}`}
          </Button>
        </section>
      </div>
    </>
  );
}

function GrupoBotones({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </h3>
      <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function BotonItem(props: {
  nombre: string;
  precio: number;
  agotado?: boolean;
  conOpciones?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'flex min-h-16 flex-col items-start justify-between rounded-lg border bg-card p-2 text-left text-sm transition-colors hover:border-primary active:scale-[0.98]',
        props.agotado && 'opacity-50',
      )}
    >
      <span className="line-clamp-2 font-medium">{props.nombre}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatARS(props.precio)}
        {props.conOpciones && ' · opciones'}
        {props.agotado && ' · agotado'}
      </span>
    </button>
  );
}

function Chips(props: {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{props.etiqueta}</legend>
      <div className="flex flex-wrap gap-1.5">
        {props.opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={props.valor === o.valor}
            onClick={() => props.onCambio(o.valor)}
            className={cn(
              'h-9 rounded-full border px-3 text-sm transition-colors',
              props.valor === o.valor
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted',
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Variante, extras (respetando mín/máx) y nota de un producto con opciones. */
function ConfigurarProducto({
  producto,
  onVolver,
  onAgregar,
}: {
  producto: ProductoConId;
  onVolver: () => void;
  onAgregar: (s: SeleccionItem) => void;
}) {
  const variantes = producto.variantes ?? [];
  const grupos = producto.gruposExtras ?? [];
  const [varianteId, setVarianteId] = useState(variantes[0]?.id);
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [nota, setNota] = useState('');

  const seleccion: SeleccionItem = {
    tipo: 'producto',
    productoId: producto.id,
    ...(varianteId ? { varianteId } : {}),
    extras: Object.entries(elegidas).flatMap(([grupoId, ops]) =>
      ops.map((opcionId) => ({ grupoId, opcionId })),
    ),
    cantidad: 1,
    ...(nota.trim() ? { nota: nota.trim() } : {}),
  };
  let linea: LineaCalculada | null = null;
  let problema = '';
  try {
    linea = calcularItem(producto, seleccion, { validarDisponibilidad: false });
  } catch (e) {
    problema = e instanceof Error ? e.message : 'Revisá las opciones';
  }

  function alternar(grupoId: string, opcionId: string, max: number) {
    setElegidas((e) => {
      const actuales = e[grupoId] ?? [];
      if (actuales.includes(opcionId))
        return { ...e, [grupoId]: actuales.filter((o) => o !== opcionId) };
      if (max === 1) return { ...e, [grupoId]: [opcionId] };
      if (actuales.length >= max) return e;
      return { ...e, [grupoId]: [...actuales, opcionId] };
    });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a la carta
      </button>
      <h3 className="text-lg font-semibold">{producto.nombre}</h3>
      {variantes.length > 0 && (
        <Chips
          etiqueta="Variante"
          opciones={variantes.map((v) => ({
            valor: v.id,
            texto: `${v.nombre} · ${formatARS(v.precio)}`,
          }))}
          valor={varianteId ?? ''}
          onCambio={setVarianteId}
        />
      )}
      {grupos.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-1 text-sm font-medium">
            {g.nombre}{' '}
            <span className="font-normal text-muted-foreground">
              {g.min > 0
                ? `(elegí ${g.min === g.max ? g.min : `${g.min} a ${g.max}`})`
                : `(hasta ${g.max})`}
            </span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {g.opciones.map((o) => {
              const activa = elegidas[g.id]?.includes(o.id) ?? false;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => alternar(g.id, o.id, g.max)}
                  className={cn(
                    'h-9 rounded-full border px-3 text-sm',
                    activa
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-muted',
                  )}
                >
                  {o.nombre}
                  {o.precio > 0 && ` +${formatARS(o.precio)}`}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="space-y-1">
        <Label htmlFor="np-nota">Nota</Label>
        <Input
          id="np-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, 200))}
          placeholder="Ej.: sin cebolla"
        />
      </div>
      {problema && <p className="text-sm text-destructive">{problema}</p>}
      <Button className="w-full" disabled={!linea} onClick={() => onAgregar(seleccion)}>
        Agregar{linea && ` · ${formatARS(linea.subtotal)}`}
      </Button>
    </div>
  );
}
