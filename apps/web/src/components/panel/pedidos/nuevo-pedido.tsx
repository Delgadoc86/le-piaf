'use client';

/**
 * Carga rápida de pedidos de mostrador o teléfono estilo POS gastronómico (Fudo / Toast).
 * Diseñado para alta velocidad táctil: categorías fijas, azulejos de un toque,
 * ticket ordenado en 3 pasos y vista optimizada tanto para escritorio como para celular.
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  Bike,
  Building2,
  Check,
  Flame,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
      <DialogContent
        showCloseButton={false}
        style={{
          width: '96vw',
          maxWidth: '1550px',
          height: '95dvh',
          maxHeight: '95dvh',
        }}
        className="w-[96vw] !max-w-[1550px] sm:!max-w-[1550px] md:!max-w-[1550px] lg:!max-w-[1550px] xl:!max-w-[1550px] 2xl:!max-w-[1550px] h-[95dvh] !max-h-[95dvh] sm:!max-h-[95dvh] p-0 overflow-hidden rounded-3xl flex flex-col border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] shadow-2xl"
      >
        {abierto && <Contenido tipos={tipos} onCreado={onCreado} onCerrar={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

/** Misma elección sin contar la cantidad = misma línea. */
function claveDe(s: SeleccionItem): string {
  return JSON.stringify({ ...s, cantidad: 0 });
}

function Contenido({
  tipos,
  onCreado,
  onCerrar,
}: Pick<Props, 'tipos' | 'onCreado' | 'onCerrar'>) {
  const productos = useColeccion<ProductoDatos>('productos');
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const promos = useColeccion<PromoDatos>('promos');

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null); // null = todas
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

  // En celular: pestaña activa entre 'carta' y 'ticket'
  const [tabMovil, setTabMovil] = useState<'carta' | 'ticket'>('carta');

  const porId = useMemo(
    () => ({
      productos: new Map(productos.datos.map((p) => [p.id, p])),
      promos: new Map(promos.datos.map((p) => [p.id, p])),
    }),
    [productos.datos, promos.datos],
  );

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
  const totalItems = lineas.reduce((acc, l) => acc + l.seleccion.cantidad, 0);

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
    if ((p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.length ?? 0) > 0) {
      setConfigurando(p);
    } else {
      agregar({ tipo: 'producto', productoId: p.id, extras: [], cantidad: 1 });
    }
  }

  const texto = busqueda.trim().toLowerCase();

  const promosVisibles = promos.datos.filter(
    (p) =>
      p.activa &&
      (!categoriaId || categoriaId === 'promos') &&
      (!texto || p.titulo.toLowerCase().includes(texto)),
  );

  const categoriasFiltradas = categorias.datos.filter(
    (c) => !categoriaId || categoriaId === c.id,
  );

  const grupos = categoriasFiltradas
    .map((c) => ({
      categoria: c,
      productos: productos.datos.filter(
        (p) => p.categoriaId === c.id && (!texto || p.nombre.toLowerCase().includes(texto)),
      ),
    }))
    .filter((g) => g.productos.length > 0);

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra superior de título con pestañas móviles */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-black">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Carga Rápida de Pedidos
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
              Mostrador o teléfono · Entra directo a cocina
            </p>
          </div>
        </div>

        {/* Pestañas para celular: Carta vs Ticket */}
        <div className="flex md:hidden items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTabMovil('carta')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition',
              tabMovil === 'carta'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500',
            )}
          >
            🍽️ Carta
          </button>
          <button
            type="button"
            onClick={() => setTabMovil('ticket')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5',
              tabMovil === 'ticket'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500',
            )}
          >
            <Receipt className="size-3.5" />
            <span>Ticket</span>
            {totalItems > 0 && (
              <span className="rounded-full bg-orange-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar ventana"
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition"
        >
          <X className="size-5" />
        </button>
      </header>

      {/* Cuerpo principal en 2 columnas: POS Carta a la izquierda (flexible) | Ticket a la derecha (fijo) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Columna Izquierda: Carta, Tabs de Categorías y Buscador */}
        <div
          className={cn(
            'flex-1 flex flex-col h-full overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-w-0',
            tabMovil !== 'carta' && 'hidden md:flex',
          )}
        >
          {configurando ? (
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <ConfigurarProducto
                producto={configurando}
                onVolver={() => setConfigurando(null)}
                onAgregar={(s) => {
                  agregar(s);
                  setConfigurando(null);
                  if (tabMovil === 'carta' && window.innerWidth < 768) {
                    setTabMovil('ticket');
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Buscador + Píldoras de Categoría fijas superiores estilo Fudo */}
              <div className="p-3 md:p-4 space-y-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] z-10 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar plato, promo o bebida…"
                    className="pl-9 h-11 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    aria-label="Buscar en la carta"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Barra de pestañas horizontales de categorías */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setCategoriaId(null)}
                    className={cn(
                      'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border',
                      categoriaId === null
                        ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    Todos
                  </button>
                  {promos.datos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCategoriaId('promos')}
                      className={cn(
                        'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border flex items-center gap-1',
                        categoriaId === 'promos'
                          ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      <Flame className="size-3.5 text-orange-400" />
                      <span>Promos</span>
                    </button>
                  )}
                  {categorias.datos.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaId(cat.id)}
                      className={cn(
                        'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border whitespace-nowrap',
                        categoriaId === cat.id
                          ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grilla de Platos Táctiles */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-5">
                {promosVisibles.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-black tracking-wider text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1">
                      <Flame className="size-3.5" />
                      <span>Promos del día</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3">
                      {promosVisibles.map((p) => (
                        <AzulejoPlato
                          key={p.id}
                          nombre={p.titulo}
                          precio={p.precio}
                          esPromo
                          onClick={() => agregar({ tipo: 'promo', promoId: p.id, cantidad: 1 })}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {grupos.map((g) => (
                  <div key={g.categoria.id}>
                    <h3 className="mb-2 text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                      {g.categoria.nombre}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3">
                      {g.productos.map((p) => (
                        <AzulejoPlato
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
                    </div>
                  </div>
                ))}

                {grupos.length === 0 && promosVisibles.length === 0 && (
                  <div className="py-12 text-center text-sm font-medium text-slate-400">
                    No se encontraron productos para esta búsqueda.
                  </div>
                )}
              </div>

              {/* Botón flotante móvil para saltar al ticket si hay items */}
              {totalItems > 0 && (
                <div className="md:hidden p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  <Button
                    size="lg"
                    className="h-12 w-full text-base font-black bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-between"
                    onClick={() => setTabMovil('ticket')}
                  >
                    <span className="flex items-center gap-2">
                      <Receipt className="size-4" />
                      <span>Ver Ticket ({totalItems})</span>
                    </span>
                    <span className="tabular-nums">{formatARS(total)} →</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Columna Derecha: Ticket de Comanda, Entrega y Cobro */}
        <div
          className={cn(
            'w-full md:w-[420px] lg:w-[460px] xl:w-[500px] shrink-0 flex flex-col h-full overflow-hidden bg-slate-50/70 dark:bg-slate-900/50',
            tabMovil !== 'ticket' && 'hidden md:flex',
          )}
        >
          {/* Cabecera del Ticket */}
          <div className="p-3.5 md:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0b1120] shrink-0">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-orange-500" />
              <span className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                Comanda de mostrador
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
              </span>
              {lineas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLineas([])}
                  className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Vaciar
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Ítems del Ticket (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3.5 md:p-4 space-y-4">
            {lineas.length === 0 ? (
              <div className="py-14 text-center space-y-3 p-5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 mx-auto">
                  <Utensils className="size-7" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                    Comanda en blanco
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Tocá cualquier plato de la carta a la izquierda para sumarlo al pedido.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden">
                {lineas.map((l, n) => {
                  const c: LineaCalculada | null | undefined = calculadas[n];
                  return (
                    <li key={l.clave} className="flex items-center gap-2 p-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">
                          {c?.nombre ?? 'No disponible'}
                          {c?.varianteNombre && (
                            <span className="font-medium text-slate-500 text-xs">
                              {' '}
                              · {c.varianteNombre}
                            </span>
                          )}
                        </p>
                        {c && c.extras.length > 0 && (
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-snug">
                            + {c.extras.map((e) => e.nombre).join(', ')}
                          </p>
                        )}
                        {l.seleccion.nota && (
                          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 italic">
                            “{l.seleccion.nota}”
                          </p>
                        )}
                      </div>

                      {/* Controles táctiles de cantidad +/- */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label="Disminuir cantidad"
                          onClick={() => cambiarCantidad(l.clave, l.seleccion.cantidad - 1)}
                          className="flex size-7 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                        >
                          {l.seleccion.cantidad === 1 ? (
                            <Trash2 className="size-3.5 text-rose-500" />
                          ) : (
                            <Minus className="size-3.5" />
                          )}
                        </button>
                        <span className="w-5 text-center font-black text-sm tabular-nums">
                          {l.seleccion.cantidad}
                        </span>
                        <button
                          type="button"
                          aria-label="Aumentar cantidad"
                          onClick={() =>
                            cambiarCantidad(l.clave, Math.min(99, l.seleccion.cantidad + 1))
                          }
                          className="flex size-7 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <span className="w-20 text-right font-black text-sm tabular-nums text-slate-900 dark:text-white">
                        {c ? formatARS(c.subtotal) : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Ajustes del pedido: Tipo de Entrega, Datos y Pago */}
            <div className="space-y-3.5 pt-1">
              {/* Tipo de Entrega (Retiro, Delivery, Salón) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tipo de entrega
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {tiposDisponibles.map((t) => {
                    const IconoTipo =
                      t === 'take_away' ? ShoppingBag : t === 'delivery' ? Bike : Utensils;
                    const activo = tipo === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={cn(
                          'h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                          activo
                            ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                        )}
                      >
                        <IconoTipo className="size-3.5" />
                        <span>{ETIQUETA_TIPO[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Origen del pedido (Mostrador / Teléfono) */}
              <div className="flex gap-2">
                {(['mostrador', 'telefono'] as const).map((orig) => (
                  <button
                    key={orig}
                    type="button"
                    onClick={() => setOrigen(orig)}
                    className={cn(
                      'flex-1 h-8 rounded-lg border text-xs font-bold capitalize transition',
                      origen === orig
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
                    )}
                  >
                    {orig}
                  </button>
                ))}
              </div>

              {/* Datos del Cliente */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="np-nombre" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Nombre cliente
                  </Label>
                  <Input
                    id="np-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.slice(0, 60))}
                    placeholder="Opcional"
                    className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="np-tel" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    WhatsApp
                  </Label>
                  <Input
                    id="np-tel"
                    value={telefono}
                    inputMode="tel"
                    onChange={(e) => setTelefono(e.target.value.slice(0, 25))}
                    placeholder="Opcional"
                    className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900"
                    aria-invalid={telefonoInvalido || undefined}
                  />
                </div>
              </div>

              {tipo === 'delivery' && (
                <div className="space-y-1">
                  <Label htmlFor="np-dir" className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Dirección de entrega *
                  </Label>
                  <Input
                    id="np-dir"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value.slice(0, 200))}
                    placeholder="Calle, número, timbre…"
                    className="h-10 rounded-xl text-xs border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              {/* Medio de Pago */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Forma de pago
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMedio('efectivo')}
                    className={cn(
                      'h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                      medio === 'efectivo'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <Banknote className="size-4" />
                    <span>Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedio('transferencia')}
                    className={cn(
                      'h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                      medio === 'transferencia'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <Building2 className="size-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              {/* Estado de cobro: Ya pagó */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {pagado ? '🟢 El cliente ya pagó' : '⏳ A cobrar al entregar'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {pagado ? 'Se registra cobrado de inmediato' : 'Queda pendiente en el panel'}
                  </p>
                </div>
                <Switch checked={pagado} onCheckedChange={setPagado} />
              </div>

              {error && <p className="text-xs font-bold text-destructive">{error}</p>}
            </div>
          </div>

          {/* Pie Fijo del Ticket: Total y Botón de Enviar */}
          <div className="p-3.5 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total pedido
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {formatARS(total)}
              </span>
            </div>

            <Button
              size="lg"
              className="h-14 w-full text-base font-black bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
              onClick={() => void enviar()}
              disabled={!puedeEnviar}
            >
              <Check className="size-5" />
              <span>{enviando ? 'Cargando pedido…' : `CARGAR PEDIDO · ${formatARS(total)}`}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Azulejo táctil de plato grande estilo POS */
function AzulejoPlato(props: {
  nombre: string;
  precio: number;
  esPromo?: boolean;
  agotado?: boolean;
  conOpciones?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'group flex min-h-[96px] md:min-h-[104px] flex-col justify-between rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.98] shadow-xs',
        props.esPromo
          ? 'border-orange-500/50 bg-orange-500/10 hover:border-orange-500 dark:bg-orange-500/15'
          : 'border-slate-200 bg-white hover:border-orange-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500',
        props.agotado && 'opacity-40 grayscale pointer-events-none',
      )}
    >
      <div className="space-y-1">
        <span className="line-clamp-2 text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
          {props.nombre}
        </span>
      </div>

      <div className="flex items-end justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-sm md:text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatARS(props.precio)}
        </span>
        <div className="flex items-center gap-1.5">
          {props.conOpciones && (
            <span className="rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-400 px-2 py-0.5 text-[11px] font-bold">
              + Opciones
            </span>
          )}
          {props.agotado && (
            <span className="rounded-lg bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-600">
              Agotado
            </span>
          )}
          <span className="flex size-7 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-orange-500 group-hover:text-white dark:bg-slate-800 dark:group-hover:bg-orange-500 transition-colors text-slate-600 font-bold">
            <Plus className="size-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

/** Configuración de variantes, extras y notas de producto */
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
    <div className="max-w-xl mx-auto space-y-5">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
      >
        <ArrowLeft className="size-4" />
        <span>Volver a la carta</span>
      </button>

      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{producto.nombre}</h3>
        {producto.descripcion && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{producto.descripcion}</p>
        )}
      </div>

      {variantes.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Elegí una variante
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVarianteId(v.id)}
                className={cn(
                  'h-12 rounded-xl border p-2 text-xs font-bold flex items-center justify-between transition-all active:scale-[0.98]',
                  varianteId === v.id
                    ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                )}
              >
                <span>{v.nombre}</span>
                <span className="tabular-nums font-black">{formatARS(v.precio)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {grupos.map((g) => (
        <fieldset key={g.id} className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {g.nombre}{' '}
            <span className="font-normal text-slate-400">
              {g.min > 0
                ? `(elegí ${g.min === g.max ? g.min : `${g.min} a ${g.max}`})`
                : `(hasta ${g.max})`}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {g.opciones.map((o) => {
              const activa = elegidas[g.id]?.includes(o.id) ?? false;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => alternar(g.id, o.id, g.max)}
                  className={cn(
                    'h-11 rounded-xl border px-3 text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5',
                    activa
                      ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <span>{o.nombre}</span>
                  {o.precio > 0 && <span className="tabular-nums font-black">+{formatARS(o.precio)}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="space-y-1.5">
        <Label htmlFor="np-nota" className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Aclaración especial para la cocina
        </Label>
        <Input
          id="np-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, 200))}
          placeholder="Ej.: sin cebolla, mayonesa aparte, bien cocido…"
          className="h-12 rounded-xl text-sm bg-white dark:bg-slate-900"
        />
      </div>

      {problema && <p className="text-xs font-bold text-destructive">{problema}</p>}

      <Button
        className="h-14 w-full text-base font-black bg-orange-600 hover:bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-600/30 transition-transform active:scale-[0.99]"
        disabled={!linea}
        onClick={() => onAgregar(seleccion)}
      >
        <span>Agregar al ticket</span>
        {linea && <span className="tabular-nums">· {formatARS(linea.subtotal)}</span>}
      </Button>
    </div>
  );
}
