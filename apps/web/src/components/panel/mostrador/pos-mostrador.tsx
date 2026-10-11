'use client';

/**
 * Pantalla completa de Mostrador (POS Gastronómico estilo Fudo / Toast).
 * Diseñada para alta velocidad operativa:
 * - Carta completa a la izquierda con pestañas de categorías fijas y buscador.
 * - Ticket de comanda a la derecha con paso a paso claro (entrega, cliente, cobro).
 * - Exclusión rápida de ingredientes ("Por defecto Completo", con chips "Sin Mostaza", "Sin Cebolla", etc.).
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Flame,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Scissors,
  ShoppingBag,
  Trash2,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import {
  calcularItem,
  calcularItemPromo,
  formatARS,
  vuelto,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useColeccion, mensajeError } from '@/features/panel/firestore';
import { crearPedidoManual, ETIQUETA_TIPO } from '@/features/panel/pedidos';
import { useCajaAbierta } from '@/features/panel/caja';
import { normalizarTelefonoAR } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type ProductoConId = ProductoDatos & { id: string };

interface Linea {
  clave: string;
  seleccion: SeleccionItem;
  sinIngredientes?: string[];
  notaExtra?: string;
}

export const INGREDIENTES_EXCLUSION_COMUNES = [
  'Cebolla',
  'Mostaza',
  'Mayonesa',
  'Lechuga',
  'Tomate',
  'Pepinillos',
  'Queso / Cheddar',
  'Salsa especial',
  'Panceta / Bacon',
  'Picante',
  'Sal',
] as const;

interface Props {
  tipos: ConfigPedidos['tipos'];
}

function esBebidaOBarra(producto: ProductoConId, categoriaNombre = ''): boolean {
  if (producto.estacion === 'barra') return true;
  const texto = `${categoriaNombre} ${producto.nombre}`.toLowerCase();
  return /bebida|cerveza|trago|vino|gaseosa|lata|botella|agua|soda|chopera|pinta|gin|fernet|aperitivo/i.test(
    texto,
  );
}

export function PosMostrador({ tipos }: Props) {
  const caja = useCajaAbierta();
  const productos = useColeccion<ProductoDatos>('productos');
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const promos = useColeccion<PromoDatos>('promos');

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null); // null = todas
  const [configurando, setConfigurando] = useState<{
    producto: ProductoConId;
    lineaExistente?: { index: number; linea: Linea };
  } | null>(null);

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tipo, setTipo] = useState<TipoPedido>('take_away');
  const [origen, setOrigen] = useState<OrigenManual>('mostrador');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [medio, setMedio] = useState<MedioPagoManual>('efectivo');
  const [pagaConTexto, setPagaConTexto] = useState('');
  const [pagado, setPagado] = useState(true); // En mostrador suele pagarse en el acto
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ numero: number; total: number; vuelto?: number } | null>(null);
  const [tabMovil, setTabMovil] = useState<'carta' | 'ticket'>('carta');

  // Cálculo de subtotales
  const calculadas = useMemo(() => {
    const mapaProductos = new Map(productos.datos.map((p) => [p.id, p]));
    const mapaPromos = new Map(promos.datos.map((p) => [p.id, p]));

    return lineas.map((l) => {
      try {
        if (l.seleccion.tipo === 'producto') {
          const prod = mapaProductos.get(l.seleccion.productoId);
          if (!prod) return null;
          return calcularItem(prod, l.seleccion, { validarDisponibilidad: false });
        }
        const promo = mapaPromos.get(l.seleccion.promoId);
        if (!promo) return null;
        return calcularItemPromo(promo, l.seleccion);
      } catch {
        return null;
      }
    });
  }, [lineas, productos.datos, promos.datos]);

  const total = calculadas.reduce((sum, c) => sum + (c?.subtotal ?? 0), 0);
  const totalItems = lineas.reduce((sum, l) => sum + l.seleccion.cantidad, 0);

  // Cálculo de vuelto para efectivo (Estilo Fudo)
  const pagaConNum = pagaConTexto.trim() ? Number(pagaConTexto.replace(/\D/g, '')) : undefined;
  const montoVuelto = medio === 'efectivo' ? vuelto(total, pagaConNum) : 0;

  function agregar(s: SeleccionItem, sinIngredientes?: string[], notaExtra?: string) {
    const clave = JSON.stringify({ ...s, cantidad: 0 });
    setLineas((prev) => {
      const idx = prev.findIndex((l) => l.clave === clave);
      const actual = prev[idx];
      if (actual) {
        const copia = [...prev];
        copia[idx] = {
          clave: actual.clave,
          sinIngredientes: actual.sinIngredientes,
          notaExtra: actual.notaExtra,
          seleccion: { ...actual.seleccion, cantidad: actual.seleccion.cantidad + s.cantidad },
        };
        return copia;
      }
      return [...prev, { clave, seleccion: s, sinIngredientes, notaExtra }];
    });
  }

  function actualizarLinea(index: number, s: SeleccionItem, sinIngredientes?: string[], notaExtra?: string) {
    const clave = JSON.stringify({ ...s, cantidad: 0 });
    setLineas((prev) => {
      const copia = [...prev];
      copia[index] = { clave, seleccion: s, sinIngredientes, notaExtra };
      return copia;
    });
  }

  function cambiarCantidad(clave: string, cantidad: number) {
    setLineas((prev) => {
      if (cantidad <= 0) return prev.filter((l) => l.clave !== clave);
      return prev.map((l) =>
        l.clave === clave ? { ...l, seleccion: { ...l.seleccion, cantidad } } : l,
      );
    });
  }

  function tocarProducto(p: ProductoConId) {
    const tieneOpciones = (p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.length ?? 0) > 0;
    if (tieneOpciones) {
      setConfigurando({ producto: p });
    } else {
      // Producto directo: completo por defecto
      agregar({ tipo: 'producto', productoId: p.id, cantidad: 1, extras: [] });
    }
  }

  // Filtrado de carta
  const texto = busqueda.trim().toLowerCase();
  const promosVisibles = promos.datos.filter(
    (p) =>
      p.activa &&
      (categoriaId === null || categoriaId === 'promos') &&
      (!texto || p.titulo.toLowerCase().includes(texto)),
  );

  const grupos = categorias.datos
    .filter((c) => c.visible && (categoriaId === null || categoriaId === c.id))
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
    const vueltoCalculado = medio === 'efectivo' ? vuelto(total, pagaConNum) : 0;
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
        pago: {
          medio,
          ...(medio === 'efectivo' && pagaConNum ? { pagaCon: pagaConNum } : {}),
        },
        pagado,
      });

      setExito({ numero: r.numero, total, vuelto: vueltoCalculado });
      // Reset del pedido para el siguiente cliente
      setLineas([]);
      setNombre('');
      setTelefono('');
      setDireccion('');
      setPagaConTexto('');
      setPagado(true);
      setTabMovil('carta');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Encabezado Superior del Mostrador */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Mostrador · Carga Rápida
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase px-2 py-0.5">
                Punto de Venta
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {caja.turno ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  🟢 Caja Abierta
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Caja Cerrada (los cobros se registrarán al abrir)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Pestañas para Celular (Carta vs Ticket) */}
        <div className="flex md:hidden items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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
              <span className="rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-1.5 py-0.2 text-[10px] font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/panel/pedidos"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <Utensils className="size-3.5 text-slate-500" />
            <span>Ver Pantalla de Cocina</span>
          </Link>
          <Link
            href="/panel/caja"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-xs"
          >
            <Wallet className="size-3.5 text-slate-500" />
            <span>Caja</span>
          </Link>
        </div>
      </header>

      {/* Cartel de Éxito Flotante al Crear Pedido */}
      {exito && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-600 text-white px-5 py-3 shadow-md shrink-0 transition-all">
          <div className="flex flex-wrap items-center gap-2 text-sm font-black">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>
              ¡Pedido #{exito.numero} enviado a cocina con éxito! ({formatARS(exito.total)})
            </span>
            {exito.vuelto !== undefined && exito.vuelto > 0 && (
              <span className="rounded-xl bg-white text-emerald-900 px-3 py-1 text-xs font-black shadow-xs flex items-center gap-1">
                <Banknote className="size-3.5 text-emerald-600" />
                <span>VUELTO A ENTREGAR: {formatARS(exito.vuelto)}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExito(null)}
            className="text-xs font-bold underline hover:opacity-80 shrink-0"
          >
            ✕ Cerrar aviso
          </button>
        </div>
      )}

      {/* Área Central: Columnas Flexbox (Carta a la izquierda | Ticket a la derecha) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        {/* COLUMNA IZQUIERDA: CARTA DE PRODUCTOS Y CATEGORÍAS */}
        <div
          className={cn(
            'flex-1 flex flex-col h-full overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-w-0 bg-white dark:bg-slate-900',
            tabMovil !== 'carta' && 'hidden md:flex',
          )}
        >
          {/* Barra Fija Superior: Buscador + Píldoras de Categoría */}
          <div className="p-3 md:p-4 space-y-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar plato, combo o bebida…"
                className="pl-9 h-11 rounded-2xl text-sm bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
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

            {/* Píldoras de Categoría Fijas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
              <button
                type="button"
                onClick={() => setCategoriaId(null)}
                className={cn(
                  'h-9 shrink-0 rounded-xl px-4 transition-all active:scale-[0.98] border font-bold',
                  categoriaId === null
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
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
                    'h-9 shrink-0 rounded-xl px-4 transition-all active:scale-[0.98] border font-bold flex items-center gap-1.5',
                    categoriaId === 'promos'
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <Flame className="size-3.5 text-orange-500" />
                  <span>Promos</span>
                </button>
              )}
              {categorias.datos.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaId(cat.id)}
                  className={cn(
                    'h-9 shrink-0 rounded-xl px-4 transition-all active:scale-[0.98] border whitespace-nowrap font-bold',
                    categoriaId === cat.id
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                  )}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla Amplia de Platos (hasta 5 columnas) */}
          <div className="flex-1 overflow-y-auto p-3.5 md:p-5 space-y-6">
            {promosVisibles.length > 0 && (
              <div>
                <h2 className="mb-2.5 text-xs font-black tracking-wider text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1.5">
                  <Flame className="size-4" />
                  <span>Promos del día</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                <h2 className="mb-2.5 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  {g.categoria.nombre}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {g.productos.map((p) => {
                    const esBebida = esBebidaOBarra(p, g.categoria.nombre);
                    return (
                      <AzulejoPlato
                        key={p.id}
                        nombre={p.nombre}
                        precio={p.precio}
                        agotado={!p.disponible}
                        conOpciones={
                          (p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.length ?? 0) > 0
                        }
                        permitePersonalizar={!esBebida}
                        onClick={() => tocarProducto(p)}
                        onPersonalizar={!esBebida ? () => setConfigurando({ producto: p }) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {grupos.length === 0 && promosVisibles.length === 0 && (
              <div className="py-20 text-center text-sm font-semibold text-slate-400">
                No se encontraron productos para esta búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: TICKET DE COMANDA Y COBRO (ANCHO FIJO ERGONÓMICO) */}
        <div
          className={cn(
            'w-full md:w-[380px] lg:w-[420px] xl:w-[450px] shrink-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950/40 border-l border-slate-200 dark:border-slate-800',
            tabMovil !== 'ticket' && 'hidden md:flex',
          )}
        >
          {/* Cabecera del Ticket */}
          <div className="p-3.5 md:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <Receipt className="size-4.5 text-slate-500" />
              <span className="font-bold text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                Comanda de mostrador
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
              </span>
              {lineas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLineas([])}
                  className="h-7 px-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
                <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 mx-auto">
                  <Utensils className="size-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Comanda en blanco
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Tocá cualquier plato de la carta a la izquierda para sumarlo al pedido.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                {lineas.map((l, n) => {
                  const c: LineaCalculada | null | undefined = calculadas[n];
                  const sel = l.seleccion;
                  const prod =
                    sel.tipo === 'producto'
                      ? productos.datos.find((p) => p.id === sel.productoId)
                      : null;
                  const esBebida = prod ? esBebidaOBarra(prod) : false;

                  return (
                    <li key={l.clave} className="p-3 text-sm space-y-2">
                      <div
                        role={prod && !esBebida ? 'button' : undefined}
                        tabIndex={prod && !esBebida ? 0 : undefined}
                        onClick={() => {
                          if (prod && !esBebida) {
                            setConfigurando({
                              producto: prod,
                              lineaExistente: { index: n, linea: l },
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && prod && !esBebida) {
                            e.preventDefault();
                            setConfigurando({
                              producto: prod,
                              lineaExistente: { index: n, linea: l },
                            });
                          }
                        }}
                        className={cn(
                          'flex items-start justify-between gap-2 p-1.5 -m-1.5 rounded-xl transition select-none',
                          prod &&
                            !esBebida &&
                            'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-slate-500',
                        )}
                        title={
                          prod && !esBebida
                            ? 'Tocá para quitar ingredientes o editar notas'
                            : undefined
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {c?.nombre ?? 'No disponible'}
                            {c?.varianteNombre && (
                              <span className="font-normal text-slate-500 text-xs">
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

                          {/* Exclusiones de Ingredientes */}
                          {l.sinIngredientes && l.sinIngredientes.length > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                              <span>🚫 Sin:</span>
                              <span>{l.sinIngredientes.join(', ')}</span>
                            </p>
                          )}

                          {l.notaExtra && (
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 italic">
                              “{l.notaExtra}”
                            </p>
                          )}
                        </div>

                        {prod && !esBebida && (
                          <span className="shrink-0 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            <Scissors className="size-3 text-slate-400" />
                            <span>Editar</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        {/* Controles táctiles de cantidad +/- */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label="Disminuir cantidad"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(l.clave, l.seleccion.cantidad - 1);
                            }}
                            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                          >
                            {l.seleccion.cantidad === 1 ? (
                              <Trash2 className="size-3.5 text-rose-500" />
                            ) : (
                              <Minus className="size-3.5" />
                            )}
                          </button>
                          <span className="w-6 text-center font-bold text-sm tabular-nums text-slate-800 dark:text-slate-200">
                            {l.seleccion.cantidad}
                          </span>
                          <button
                            type="button"
                            aria-label="Aumentar cantidad"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(l.clave, Math.min(99, l.seleccion.cantidad + 1));
                            }}
                            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <span className="text-right font-bold text-base tabular-nums text-slate-900 dark:text-white">
                          {c ? formatARS(c.subtotal) : '—'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Ajustes del pedido: Tipo de Entrega, Datos y Pago */}
            <div className="space-y-4 pt-1">
              {/* Tipo de Entrega */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                          'h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                          activo
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                        )}
                      >
                        <IconoTipo className="size-4" />
                        <span>{ETIQUETA_TIPO[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Origen del pedido */}
              <div className="flex gap-2">
                {(['mostrador', 'telefono'] as const).map((orig) => {
                  const activo = origen === orig;
                  return (
                    <button
                      key={orig}
                      type="button"
                      onClick={() => setOrigen(orig)}
                      className={cn(
                        'flex-1 h-9 rounded-xl border text-xs font-bold capitalize transition',
                        activo
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {orig === 'mostrador' ? '🧍 Mostrador' : '📞 Teléfono / WhatsApp'}
                    </button>
                  );
                })}
              </div>

              {/* Datos del Cliente */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="pm-nombre" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Nombre cliente
                  </Label>
                  <Input
                    id="pm-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.slice(0, 60))}
                    placeholder="Opcional"
                    className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pm-tel" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    WhatsApp
                  </Label>
                  <Input
                    id="pm-tel"
                    value={telefono}
                    inputMode="tel"
                    onChange={(e) => setTelefono(e.target.value.slice(0, 25))}
                    placeholder="Opcional"
                    className="h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    aria-invalid={telefonoInvalido || undefined}
                  />
                </div>
              </div>

              {tipo === 'delivery' && (
                <div className="space-y-1">
                  <Label htmlFor="pm-dir" className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Dirección de entrega *
                  </Label>
                  <Input
                    id="pm-dir"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value.slice(0, 200))}
                    placeholder="Calle, número, timbre…"
                    className="h-10 rounded-xl text-xs border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              {/* Medio de Pago */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Forma de pago
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMedio('efectivo')}
                    className={cn(
                      'h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                      medio === 'efectivo'
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
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
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <Building2 className="size-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              {/* Calculadora de Vuelto para Efectivo (Estilo Fudo Limpio y Armonioso) */}
              {medio === 'efectivo' && total > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="pm-pagacon"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
                    >
                      <Banknote className="size-4 text-slate-500" />
                      <span>¿Con cuánto paga el cliente?</span>
                    </Label>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Total: {formatARS(total)}
                    </span>
                  </div>

                  {/* Botones de billetes rápidos con diseño consistente */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPagaConTexto(String(total))}
                      className={cn(
                        'h-8 rounded-lg px-2.5 text-xs font-bold border transition active:scale-95',
                        pagaConNum === total
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100',
                      )}
                    >
                      Exacto ({formatARS(total)})
                    </button>

                    {[2000, 5000, 10000, 20000, 50000]
                      .filter((b) => b > total)
                      .slice(0, 3)
                      .map((billete) => (
                        <button
                          key={billete}
                          type="button"
                          onClick={() => setPagaConTexto(String(billete))}
                          className={cn(
                            'h-8 rounded-lg px-2.5 text-xs font-bold border transition active:scale-95',
                            pagaConNum === billete
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100',
                          )}
                        >
                          {formatARS(billete)}
                        </button>
                      ))}
                  </div>

                  {/* Input de monto personalizado */}
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-bold text-slate-400 text-sm">
                      $
                    </span>
                    <Input
                      id="pm-pagacon"
                      type="text"
                      inputMode="numeric"
                      value={pagaConTexto}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        setPagaConTexto(valor);
                      }}
                      placeholder="Ingresar otro importe…"
                      className="pl-7 h-10 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                    {pagaConTexto && (
                      <button
                        type="button"
                        onClick={() => setPagaConTexto('')}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Cartel de Vuelto con Alto Contraste y Cero Estridencia */}
                  {pagaConNum !== undefined && (
                    <div
                      className={cn(
                        'rounded-xl p-3 flex items-center justify-between border transition-all',
                        montoVuelto > 0
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                          : pagaConNum === total
                          ? 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700'
                          : 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {montoVuelto > 0
                          ? 'Vuelto a entregar:'
                          : pagaConNum === total
                          ? 'Pago exacto · Sin vuelto'
                          : 'Falta para completar el total:'}
                      </span>
                      <span
                        className={cn(
                          'text-xl font-bold tabular-nums',
                          montoVuelto > 0 && 'text-emerald-700 dark:text-emerald-300 font-black',
                        )}
                      >
                        {montoVuelto > 0
                          ? formatARS(montoVuelto)
                          : pagaConNum === total
                          ? '—'
                          : formatARS(total - pagaConNum)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Estado de cobro: Ya pagó */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {pagado ? '🟢 El cliente ya pagó' : '⏳ A cobrar al entregar'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {pagado ? 'Suma a la caja de inmediato' : 'Queda pendiente en comandas'}
                  </p>
                </div>
                <Switch checked={pagado} onCheckedChange={setPagado} />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Pie Fijo del Ticket: Total y Botón de Enviar */}
          <div className="p-3.5 md:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total a cobrar
              </span>
              <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {formatARS(total)}
              </span>
            </div>

            <Button
              size="lg"
              className="h-14 w-full text-base font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-40"
              onClick={() => void enviar()}
              disabled={!puedeEnviar}
            >
              <Check className="size-5" />
              <span>
                {enviando ? 'Cargando pedido…' : `Confirmar y enviar a cocina · ${formatARS(total)}`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* DIÁLOGO / DRAWER DE PERSONALIZACIÓN Y QUITAR INGREDIENTES */}
      {configurando && (
        <DialogoPersonalizarPlato
          abierto={Boolean(configurando)}
          producto={configurando.producto}
          lineaInicial={configurando.lineaExistente?.linea}
          onCerrar={() => setConfigurando(null)}
          onConfirmar={(seleccion, sinIngredientes, notaExtra) => {
            if (configurando.lineaExistente !== undefined) {
              actualizarLinea(
                configurando.lineaExistente.index,
                seleccion,
                sinIngredientes,
                notaExtra,
              );
            } else {
              agregar(seleccion, sinIngredientes, notaExtra);
            }
            setConfigurando(null);
            if (tabMovil === 'carta' && typeof window !== 'undefined' && window.innerWidth < 768) {
              setTabMovil('ticket');
            }
          }}
        />
      )}
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
  permitePersonalizar?: boolean;
  onClick: () => void;
  onPersonalizar?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={props.agotado ? -1 : 0}
      onClick={props.onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !props.agotado) {
          e.preventDefault();
          props.onClick();
        }
      }}
      className={cn(
        'group flex min-h-[108px] flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] shadow-xs cursor-pointer select-none bg-white dark:bg-slate-900',
        props.esPromo
          ? 'border-orange-500/40 bg-orange-500/5 hover:border-orange-500 dark:bg-orange-500/10'
          : 'border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600',
        props.agotado && 'opacity-40 grayscale pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white leading-snug">
          {props.nombre}
        </span>
        {props.permitePersonalizar && !props.agotado && (
          <button
            type="button"
            title="Quitar ingredientes o personalizar"
            onClick={(e) => {
              e.stopPropagation();
              props.onPersonalizar?.();
            }}
            className="shrink-0 size-7 -mt-1 -mr-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition"
          >
            <Scissors className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-end justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-base font-black tabular-nums text-slate-900 dark:text-white">
          {formatARS(props.precio)}
        </span>
        <div className="flex items-center gap-1.5">
          {props.conOpciones && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 text-[10px] font-semibold">
              + Opciones
            </span>
          )}
          {props.agotado && (
            <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
              Agotado
            </span>
          )}
          <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-colors text-slate-700 dark:text-slate-200 font-bold">
            <Plus className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Diálogo táctil inspirado en Fudo para variantes, extras y QUITAR INGREDIENTES */
function DialogoPersonalizarPlato({
  abierto,
  producto,
  lineaInicial,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  producto: ProductoConId;
  lineaInicial?: Linea;
  onCerrar: () => void;
  onConfirmar: (s: SeleccionItem, sinIngredientes?: string[], notaExtra?: string) => void;
}) {
  const variantes = producto.variantes ?? [];
  const grupos = producto.gruposExtras ?? [];

  const [varianteId, setVarianteId] = useState<string | undefined>(() => {
    if (lineaInicial?.seleccion.tipo === 'producto') {
      return lineaInicial.seleccion.varianteId ?? variantes[0]?.id;
    }
    return variantes[0]?.id;
  });

  const [elegidas, setElegidas] = useState<Record<string, string[]>>(() => {
    if (lineaInicial?.seleccion.tipo === 'producto' && lineaInicial.seleccion.extras) {
      const mapa: Record<string, string[]> = {};
      lineaInicial.seleccion.extras.forEach((e) => {
        mapa[e.grupoId] = [...(mapa[e.grupoId] ?? []), e.opcionId];
      });
      return mapa;
    }
    return {};
  });

  // Ingredientes quitados (por defecto ninguno = completo con todo)
  const [sinIngredientes, setSinIngredientes] = useState<string[]>(
    () => lineaInicial?.sinIngredientes ?? [],
  );
  const [notaLibre, setNotaLibre] = useState(() => lineaInicial?.notaExtra ?? '');

  // Generación de la nota final para la cocina
  const notaFinalCocina = useMemo(() => {
    const partes: string[] = [];
    if (sinIngredientes.length > 0) {
      partes.push(`SIN ${sinIngredientes.map((i) => i.toUpperCase()).join(', SIN ')}`);
    }
    if (notaLibre.trim()) {
      partes.push(notaLibre.trim());
    }
    return partes.join(' · ');
  }, [sinIngredientes, notaLibre]);

  const seleccion: SeleccionItem = {
    tipo: 'producto',
    productoId: producto.id,
    ...(varianteId ? { varianteId } : {}),
    extras: Object.entries(elegidas).flatMap(([grupoId, ops]) =>
      ops.map((opcionId) => ({ grupoId, opcionId })),
    ),
    cantidad: lineaInicial?.seleccion.cantidad ?? 1,
    ...(notaFinalCocina ? { nota: notaFinalCocina } : {}),
  };

  let lineaCalculada: LineaCalculada | null = null;
  let problema = '';
  try {
    lineaCalculada = calcularItem(producto, seleccion, { validarDisponibilidad: false });
  } catch (e) {
    problema = e instanceof Error ? e.message : 'Revisá las opciones elegidas';
  }

  function alternarExtra(grupoId: string, opcionId: string, max: number) {
    setElegidas((prev) => {
      const actuales = prev[grupoId] ?? [];
      if (actuales.includes(opcionId)) {
        return { ...prev, [grupoId]: actuales.filter((o) => o !== opcionId) };
      }
      if (max === 1) return { ...prev, [grupoId]: [opcionId] };
      if (actuales.length >= max) return prev;
      return { ...prev, [grupoId]: [...actuales, opcionId] };
    });
  }

  function alternarSinIngrediente(ing: string) {
    setSinIngredientes((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing],
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl sm:max-w-xl rounded-3xl p-5 md:p-6 space-y-5 max-h-[92dvh] overflow-y-auto"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {producto.nombre}
            </DialogTitle>
            {producto.descripcion && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {producto.descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-5" />
          </button>
        </DialogHeader>

        {/* 1. Selección de Variante si existe */}
        {variantes.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-xs font-black uppercase tracking-wider text-slate-500">
              Tamaño / Variante
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
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <span>{v.nombre}</span>
                  <span className="tabular-nums font-bold">{formatARS(v.precio)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* 2. Extras Agregados */}
        {grupos.map((g) => (
          <fieldset key={g.id} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    onClick={() => alternarExtra(g.id, o.id, g.max)}
                    className={cn(
                      'h-11 rounded-xl border px-3 text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5',
                      activa
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <span>{o.nombre}</span>
                    {o.precio > 0 && (
                      <span className="tabular-nums font-bold">+{formatARS(o.precio)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* 3. QUITAR INGREDIENTES (INSPIRADO EN FUDO) */}
        <section className="space-y-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="size-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Quitar ingredientes (Por defecto: Completo)
              </span>
            </div>
            {sinIngredientes.length > 0 && (
              <button
                type="button"
                onClick={() => setSinIngredientes([])}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 underline flex items-center gap-1 hover:opacity-80"
              >
                <RotateCcw className="size-3" />
                <span>Restablecer a completo</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sinIngredientes.length === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                ✅ Sale completo con todos los ingredientes. Tocá para quitar:
              </span>
            ) : (
              <span className="text-rose-700 dark:text-rose-400 font-semibold">
                🚫 Se sacará de la comanda: {sinIngredientes.join(', ')}
              </span>
            )}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {INGREDIENTES_EXCLUSION_COMUNES.map((ing) => {
              const quitado = sinIngredientes.includes(ing);
              return (
                <button
                  key={ing}
                  type="button"
                  onClick={() => alternarSinIngrediente(ing)}
                  className={cn(
                    'h-10 rounded-xl px-3 text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 border',
                    quitado
                      ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <span>{quitado ? '✕ Sin' : 'Quitar'}</span>
                  <span>{ing}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Aclaración extra para la cocina */}
        <div className="space-y-1.5">
          <Label htmlFor="dp-nota" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Aclaración extra de cocina (opcional)
          </Label>
          <Input
            id="dp-nota"
            value={notaLibre}
            onChange={(e) => setNotaLibre(e.target.value.slice(0, 150))}
            placeholder="Ej.: bien cocido, sin sal en las papas, aderezo aparte…"
            className="h-11 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>

        {notaFinalCocina && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            ⚠️ AVISO EN COMANDA: “{notaFinalCocina}”
          </div>
        )}

        {problema && <p className="text-xs font-bold text-destructive">{problema}</p>}

        <Button
          size="lg"
          className="h-14 w-full text-base font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-2xl shadow-sm transition-transform active:scale-[0.99]"
          disabled={!lineaCalculada}
          onClick={() => {
            if (lineaCalculada) {
              onConfirmar(seleccion, sinIngredientes, notaLibre.trim() || undefined);
            }
          }}
        >
          <span>{lineaInicial ? 'Guardar cambios' : 'Agregar al ticket'}</span>
          {lineaCalculada && (
            <span className="tabular-nums font-bold">· {formatARS(lineaCalculada.subtotal)}</span>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
