'use client';

/**
 * Pantalla completa de Mostrador (Filosofía "Papel y Lapicera").
 * Diseñada para alta velocidad operativa en cocinas de barrio:
 * - Adición en 1 toque real: los platos sin variantes ni extras obligatorios suman directo al ticket.
 * - Columna de comanda sin scroll oculto: Entrega/Cliente fijo arriba, platos al centro, Cobro/Vuelto fijo abajo.
 * - Soporte de cobro en Efectivo (con atajos de billetes y vuelto gigante), Transferencia y Mixto en 1 paso.
 * - Impresión térmica de comanda (58 mm / 80 mm) automática o en 1 clic.
 */
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Banknote,
  BellRing,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Flame,
  Minus,
  Phone,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Scissors,
  ShoppingBag,
  Split,
  Trash2,
  Utensils,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import {
  calcularItem,
  calcularItemPromo,
  DOC_LOCAL,
  estadoPagoDe,
  formatARS,
  vuelto,
  type CategoriaDatos,
  type ConfigPedidos,
  type ItemPedido,
  type LineaCalculada,
  type Local,
  type MedioPagoManual,
  type OrigenManual,
  type PagoPedido,
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
import { WidgetCupoTurno } from '@/components/panel/widget-cupo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useColeccion, useDocumento, mensajeError } from '@/features/panel/firestore';
import {
  crearPedidoManual,
  ETIQUETA_TIPO,
  useAlertaPedidosPendientes,
  useOnlineStatus,
} from '@/features/panel/pedidos';
import { useWakeLock } from '@/features/panel/sonido';
import {
  autoImprimirGuardado,
  guardarAutoImprimir,
  imprimirComandaTermica,
  type DatosComandaImprimible,
} from '@/features/panel/impresion';
import { useCajaAbierta } from '@/features/panel/caja';
import { normalizarTelefonoAR } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type ProductoConId = ProductoDatos & { id: string };
type ModoPagoMostrador = MedioPagoManual | 'mixto';

interface Linea {
  clave: string;
  seleccion: SeleccionItem;
  sinIngredientes?: string[];
  notaExtra?: string;
}

export const INGREDIENTES_EXCLUSION_COMUNES = [
  'Cebolla',
  'Mayonesa',
  'Mostaza',
  'Huevo',
  'Jamón',
  'Queso / Cheddar',
  'Tomate',
  'Lechuga',
  'Aceitunas',
  'Morrón',
  'Ajo',
  'Picante',
  'Sal',
] as const;

const BILLETES_RAPIDOS = [10000, 20000, 50000] as const;

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
  const local = useDocumento<Local>(DOC_LOCAL);
  const productos = useColeccion<ProductoDatos>('productos');
  const categorias = useColeccion<CategoriaDatos>('categorias');
  const promos = useColeccion<PromoDatos>('promos');
  const wakeLockActivo = useWakeLock();
  const online = useOnlineStatus();

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [configurando, setConfigurando] = useState<{
    producto: ProductoConId;
    lineaExistente?: { index: number; linea: Linea };
  } | null>(null);

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tipo, setTipo] = useState<TipoPedido>('salon');
  const [origen, setOrigen] = useState<OrigenManual>('mostrador');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mostrarTelMostrador, setMostrarTelMostrador] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [modoPago, setModoPago] = useState<ModoPagoMostrador>('efectivo');
  const [pagaConTexto, setPagaConTexto] = useState('');
  const [efectivoMixtoTexto, setEfectivoMixtoTexto] = useState('');
  const [pagado, setPagado] = useState(true);
  const [autoImprimir, setAutoImprimir] = useState(() => autoImprimirGuardado());
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{
    numero: number;
    total: number;
    vuelto?: number;
    comanda: DatosComandaImprimible;
  } | null>(null);
  const [tabMovil, setTabMovil] = useState<'carta' | 'ticket'>('carta');

  const zonaHoraria = local.datos?.zonaHoraria ?? 'America/Argentina/Buenos_Aires';
  const nombreLocal = local.datos?.nombreCorto || local.datos?.nombre || '';
  const pedidosNuevos = useAlertaPedidosPendientes(zonaHoraria, '/panel/mostrador');

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

  // Cálculo de vuelto y cobro mixto
  const pagaConNum = pagaConTexto.trim() ? Number(pagaConTexto.replace(/\D/g, '')) : undefined;
  const efectivoMixtoNum = efectivoMixtoTexto.trim()
    ? Number(efectivoMixtoTexto.replace(/\D/g, ''))
    : 0;
  const transferenciaMixtoNum = Math.max(0, total - efectivoMixtoNum);
  const montoVuelto =
    modoPago === 'efectivo'
      ? vuelto(total, pagaConNum)
      : modoPago === 'mixto'
        ? vuelto(efectivoMixtoNum, pagaConNum)
        : 0;

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

  function actualizarLinea(
    index: number,
    s: SeleccionItem,
    sinIngredientes?: string[],
    notaExtra?: string,
  ) {
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

  /**
   * Regla de los 3 toques: solo abre el diálogo si hay variantes obligatorias o grupos con min > 0.
   * Si los extras son opcionales (min === 0), 1 toque agrega directo al ticket ("Sale completo").
   */
  function tocarProducto(p: ProductoConId) {
    const requiereEleccion =
      (p.variantes?.length ?? 0) > 0 || (p.gruposExtras?.some((g) => g.min > 0) ?? false);
    if (requiereEleccion) {
      setConfigurando({ producto: p });
    } else {
      agregar({ tipo: 'producto', productoId: p.id, cantidad: 1, extras: [] });
    }
  }

  function alternarAutoImprimir() {
    setAutoImprimir((prev) => {
      const nuevo = !prev;
      guardarAutoImprimir(nuevo);
      return nuevo;
    });
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
    'salon',
    'take_away',
    ...(tipos.delivery ? (['delivery'] as const) : []),
  ];

  const pedirTelefonoVisible =
    origen === 'telefono' || tipo === 'delivery' || mostrarTelMostrador || telefono.trim().length > 0;
  const telefonoNormal = telefono.trim() ? normalizarTelefonoAR(telefono) : undefined;
  const telefonoInvalido = telefonoNormal === null;
  const faltaDireccion = tipo === 'delivery' && direccion.trim().length < 3;
  const mixtoInvalido =
    modoPago === 'mixto' && (efectivoMixtoNum <= 0 || efectivoMixtoNum >= total);

  const puedeEnviar =
    lineas.length > 0 &&
    calculadas.every((c) => c !== null) &&
    !telefonoInvalido &&
    !faltaDireccion &&
    !mixtoInvalido &&
    !enviando;

  async function enviar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    const vueltoCalculado = montoVuelto;
    const medioBase: MedioPagoManual = modoPago === 'transferencia' ? 'transferencia' : 'efectivo';
    const montoEfectivoMixto =
      modoPago === 'mixto' && pagado ? efectivoMixtoNum : undefined;

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
          medio: medioBase,
          ...(medioBase === 'efectivo' && pagaConNum ? { pagaCon: pagaConNum } : {}),
          ...(montoEfectivoMixto ? { montoEfectivoMixto } : {}),
        },
        pagado,
      });

      const itemsImprimibles: ItemPedido[] = calculadas
        .filter((c): c is LineaCalculada => c !== null)
        .map((l, i) => ({
          id: String(i + 1),
          tipo: l.tipo,
          productoId: l.refId,
          nombre: l.nombre,
          ...(l.varianteNombre ? { varianteNombre: l.varianteNombre } : {}),
          extras: l.extras,
          precioUnitario: l.precioUnitario,
          cantidad: l.cantidad,
          ...(l.nota ? { nota: l.nota } : {}),
          subtotal: l.subtotal,
          estacion: l.estacion,
          ronda: 1,
          estadoCocina: 'pendiente',
        }));

      const pagosImprimibles: PagoPedido[] = !pagado
        ? []
        : modoPago === 'mixto'
          ? [
              { medio: 'efectivo', monto: efectivoMixtoNum, estado: 'aprobado' },
              { medio: 'transferencia', monto: transferenciaMixtoNum, estado: 'aprobado' },
            ]
          : [{ medio: medioBase, monto: total, estado: 'aprobado' }];

      const comanda: DatosComandaImprimible = {
        numero: r.numero,
        tipo,
        origen,
        ...(nombre.trim() || telefonoNormal
          ? {
              cliente: {
                nombre: nombre.trim(),
                ...(telefonoNormal ? { telefono: telefonoNormal } : {}),
              },
            }
          : {}),
        ...(tipo === 'delivery'
          ? { entrega: { direccion: direccion.trim(), costo: 0 } }
          : {}),
        items: itemsImprimibles,
        subtotal: total,
        descuento: 0,
        costoEnvio: 0,
        total,
        pagoElegido: {
          medio: medioBase,
          ...(pagaConNum ? { pagaCon: pagaConNum } : {}),
        },
        pagos: pagosImprimibles,
        estadoPago: estadoPagoDe(pagosImprimibles, total),
        creadoEn: { toDate: () => new Date() },
      };

      setExito({ numero: r.numero, total, vuelto: vueltoCalculado, comanda });
      if (autoImprimir) {
        imprimirComandaTermica(comanda, { zonaHoraria, nombreLocal });
      }

      // Reset del pedido para el siguiente cliente (por defecto Mostrador + Comer acá)
      setLineas([]);
      setOrigen('mostrador');
      setTipo('salon');
      setNombre('');
      setTelefono('');
      setMostrarTelMostrador(false);
      setDireccion('');
      setPagaConTexto('');
      setEfectivoMixtoTexto('');
      setModoPago('efectivo');
      setPagado(true);
      setTabMovil('carta');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  // Atajo de teclado F12 o Ctrl+Enter para confirmar desde PC sin usar el mouse
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (configurando) return;
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        if (puedeEnviar) {
          e.preventDefault();
          void enviar();
        }
      }
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Banner de estado de red cuando cae internet */}
      {!online && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/60 px-4 py-2 text-xs font-semibold text-amber-950 dark:text-amber-200 shrink-0"
        >
          <WifiOff className="size-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>Sin conexión a internet: verificá tu conexión antes de confirmar nuevos pedidos.</span>
        </div>
      )}

      {/* Encabezado Superior del Mostrador */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
            <ShoppingBag className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Mostrador · Carga Rápida
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase px-2 py-0.5">
                3 Toques
              </span>
              {wakeLockActivo && (
                <span
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                  title="La pantalla no se suspenderá durante el turno"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Pantalla encendida
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {caja.turno ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>Caja Abierta</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span>Caja Cerrada (los cobros se registrarán al abrir)</span>
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
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5',
              tabMovil === 'carta'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500',
            )}
          >
            <Utensils className="size-3.5" />
            <span>Carta</span>
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
          <WidgetCupoTurno variante="compacto" />
          <button
            type="button"
            onClick={alternarAutoImprimir}
            title="Imprimir comanda automáticamente al confirmar pedido (en Chrome con --kiosk-printing sale directo sin diálogo)"
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition shadow-xs',
              autoImprimir
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">
              {autoImprimir ? 'Impresión auto: ON' : 'Impresión auto: OFF'}
            </span>
          </button>
          <Link
            href="/panel/pedidos"
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition shadow-xs',
              pedidosNuevos > 0
                ? 'border-2 border-orange-400 bg-orange-600 font-black text-white shadow-lg shadow-orange-500/40 animate-pulse'
                : 'hidden sm:inline-flex font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
            )}
          >
            {pedidosNuevos > 0 ? (
              <>
                <BellRing className="size-3.5 animate-bounce" />
                <span>
                  {pedidosNuevos === 1
                    ? '¡1 PEDIDO NUEVO! · Ver'
                    : `¡${pedidosNuevos} PEDIDOS NUEVOS! · Ver`}
                </span>
              </>
            ) : (
              <>
                <Utensils className="size-3.5 text-slate-500" />
                <span>Cocina</span>
              </>
            )}
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

      {/* Cartel de Éxito Flotante al Crear Pedido con Vuelto Gigante y Botón de Re-impresión */}
      {exito && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-600 text-white px-4 py-2.5 shadow-md shrink-0 transition-all">
          <div className="flex flex-wrap items-center gap-2.5 text-sm font-black">
            <CheckCircle2 className="size-5 shrink-0" />
            <span>
              Pedido #{exito.numero} enviado a cocina ({formatARS(exito.total)})
            </span>
            {exito.vuelto !== undefined && exito.vuelto > 0 && (
              <span className="rounded-xl bg-white text-emerald-950 px-3 py-1 text-sm font-black shadow-xs flex items-center gap-1.5">
                <Banknote className="size-4 text-emerald-600" />
                <span>VUELTO: {formatARS(exito.vuelto)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => imprimirComandaTermica(exito.comanda, { zonaHoraria, nombreLocal })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-black text-white transition"
            >
              <Printer className="size-3.5" />
              <span>Imprimir comanda</span>
            </button>
            <button
              type="button"
              onClick={() => setExito(null)}
              className="rounded-lg p-1 hover:bg-white/20 transition"
              aria-label="Cerrar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Área Central: Columnas Flexbox (Carta a la izquierda | Ticket sin scroll oculto a la derecha) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
        {/* COLUMNA IZQUIERDA: CARTA DE PRODUCTOS Y CATEGORÍAS */}
        <div
          className={cn(
            'flex-1 flex flex-col h-full overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-w-0 bg-white dark:bg-slate-900',
            tabMovil !== 'carta' && 'hidden md:flex',
          )}
        >
          {/* Barra Fija Superior: Buscador + Píldoras de Categoría */}
          <div className="p-3 md:p-3.5 space-y-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar plato, combo o bebida…"
                className="pl-9 h-10 rounded-2xl text-sm bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-semibold no-scrollbar">
              <button
                type="button"
                onClick={() => setCategoriaId(null)}
                className={cn(
                  'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border font-bold',
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
                    'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border font-bold flex items-center gap-1.5',
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
                    'h-9 shrink-0 rounded-xl px-3.5 transition-all active:scale-[0.98] border whitespace-nowrap font-bold',
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

          {/* Grilla Amplia de Platos */}
          <div className="flex-1 overflow-y-auto p-3.5 md:p-4 space-y-5">
            {promosVisibles.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-black tracking-wider text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1.5">
                  <Flame className="size-4" />
                  <span>Promos del día</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {promosVisibles.map((p) => {
                    const cantEnTicket = lineas.reduce(
                      (s, l) =>
                        l.seleccion.tipo === 'promo' && l.seleccion.promoId === p.id
                          ? s + l.seleccion.cantidad
                          : s,
                      0,
                    );
                    return (
                      <AzulejoPlato
                        key={p.id}
                        nombre={p.titulo}
                        precio={p.precio}
                        fotoUrl={p.fotoUrl}
                        cantidadEnTicket={cantEnTicket}
                        esPromo
                        onClick={() => agregar({ tipo: 'promo', promoId: p.id, cantidad: 1 })}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {grupos.map((g) => (
              <div key={g.categoria.id}>
                <h2 className="mb-2 text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  {g.categoria.nombre}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {g.productos.map((p) => {
                    const esBebida = esBebidaOBarra(p, g.categoria.nombre);
                    const requiereVariante =
                      (p.variantes?.length ?? 0) > 0 ||
                      (p.gruposExtras?.some((ge) => ge.min > 0) ?? false);
                    const cantEnTicket = lineas.reduce(
                      (s, l) =>
                        l.seleccion.tipo === 'producto' && l.seleccion.productoId === p.id
                          ? s + l.seleccion.cantidad
                          : s,
                      0,
                    );
                    return (
                      <AzulejoPlato
                        key={p.id}
                        nombre={p.nombre}
                        precio={p.precio}
                        fotoUrl={p.fotoUrl}
                        cantidadEnTicket={cantEnTicket}
                        agotado={!p.disponible}
                        conOpciones={requiereVariante}
                        permitePersonalizar={!esBebida}
                        onClick={() => tocarProducto(p)}
                        onPersonalizar={
                          !esBebida ? () => setConfigurando({ producto: p }) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {grupos.length === 0 && promosVisibles.length === 0 && (
              <div className="py-16 text-center text-sm font-semibold text-slate-400">
                No se encontraron productos para esta búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: HOJA DE COMANDA SIN SCROLL OCULTO (Cabecera fija + Lista platos + Pie cobro) */}
        <div
          className={cn(
            'w-full md:w-[390px] lg:w-[430px] xl:w-[460px] shrink-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950/40 border-l border-slate-200 dark:border-slate-800',
            tabMovil !== 'ticket' && 'hidden md:flex',
          )}
        >
          {/* 1. CABECERA FIJA DEL TICKET: Modalidad de Entrega + Origen + Cliente */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Receipt className="size-4 text-slate-500" />
                <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Comanda
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                { (['mostrador', 'telefono'] as const).map((orig) => (
                  <button
                    key={orig}
                    type="button"
                    onClick={() => {
                      setOrigen(orig);
                      if (orig === 'telefono' && tipo === 'salon') {
                        setTipo('take_away');
                      } else if (orig === 'mostrador') {
                        setTipo('salon');
                      }
                    }}
                    className={cn(
                      'h-7 rounded-lg px-2.5 text-[11px] font-bold border transition',
                      origen === orig
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    {orig === 'mostrador' ? 'Mostrador' : 'Teléfono'}
                  </button>
                ))}
                {lineas.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLineas([])}
                    className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    Vaciar
                  </Button>
                )}
              </div>
            </div>

            {/* Selector de Entrega en 1 fila */}
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
                      'h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]',
                      activo
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <IconoTipo className="size-3.5 shrink-0" />
                    <span className="truncate">{ETIQUETA_TIPO[t]}</span>
                  </button>
                );
              })}
            </div>

            {/* Datos mínimos del cliente: Nombre o apodo (y Teléfono/Dirección solo cuando hace falta) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Input
                  id="pm-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.slice(0, 60))}
                  placeholder="Nombre o apodo del cliente (opcional)…"
                  aria-label="Nombre o apodo del cliente"
                  className="h-9 flex-1 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
                />
                {!pedirTelefonoVisible ? (
                  <button
                    type="button"
                    onClick={() => setMostrarTelMostrador(true)}
                    title="Agregar teléfono / WhatsApp"
                    className="h-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Phone className="size-3.5" />
                    <span>+ Tel</span>
                  </button>
                ) : (
                  <Input
                    id="pm-tel"
                    value={telefono}
                    inputMode="tel"
                    onChange={(e) => setTelefono(e.target.value.slice(0, 25))}
                    placeholder="WhatsApp (opcional)"
                    aria-label="WhatsApp del cliente"
                    aria-invalid={telefonoInvalido || undefined}
                    className="h-9 w-36 sm:w-40 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
                  />
                )}
              </div>

              {tipo === 'delivery' && (
                <Input
                  id="pm-dir"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value.slice(0, 200))}
                  placeholder="Dirección de entrega (calle, altura, referencia) *"
                  aria-label="Dirección de entrega"
                  className="h-9 rounded-xl text-xs font-semibold border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-slate-900"
                />
              )}
            </div>
          </div>

          {/* 2. CENTRO CON SCROLL INDEPENDIENTE: SOLO LOS PLATOS CARGADOS */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {lineas.length === 0 ? (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
                <Utensils className="size-6 text-slate-400 mb-1.5" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Comanda en blanco
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-[230px]">
                  Tocá un plato a la izquierda para sumarlo en 1 toque.
                </p>
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
                    <li key={l.clave} className="p-2.5 text-sm space-y-1.5">
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
                          'flex items-start justify-between gap-2 p-1 -m-1 rounded-xl transition select-none',
                          prod &&
                            !esBebida &&
                            'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800',
                        )}
                        title={
                          prod && !esBebida
                            ? 'Tocá para quitar ingredientes o agregar nota'
                            : undefined
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {c?.nombre ?? 'No disponible'}
                            {c?.varianteNombre && (
                              <span className="font-semibold text-slate-500 text-xs">
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
                            <div className="mt-1 flex flex-wrap gap-1">
                              {l.sinIngredientes.map((ing) => (
                                <span
                                  key={ing}
                                  className="inline-flex items-center rounded bg-rose-600 px-1.5 py-0.2 text-[10px] font-black uppercase text-white"
                                >
                                  SIN {ing}
                                </span>
                              ))}
                            </div>
                          )}

                          {l.notaExtra && (
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                              “{l.notaExtra}”
                            </p>
                          )}
                        </div>

                        {prod && !esBebida && (
                          <span className="shrink-0 flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            <Scissors className="size-3 text-slate-400" />
                            <span>Sin…</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            aria-label="Disminuir cantidad"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(l.clave, l.seleccion.cantidad - 1);
                            }}
                            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                          >
                            {l.seleccion.cantidad === 1 ? (
                              <Trash2 className="size-3.5 text-rose-500" />
                            ) : (
                              <Minus className="size-3.5" />
                            )}
                          </button>
                          <span className="w-6 text-center font-black text-sm tabular-nums text-slate-900 dark:text-white">
                            {l.seleccion.cantidad}
                          </span>
                          <button
                            type="button"
                            aria-label="Aumentar cantidad"
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(l.clave, Math.min(99, l.seleccion.cantidad + 1));
                            }}
                            className="flex size-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        <span className="text-right font-black text-sm tabular-nums text-slate-900 dark:text-white">
                          {c ? formatARS(c.subtotal) : '—'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 3. PIE FIJO DE COBRO Y VUELTO: Siempre visible sin scrollear */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
            {/* Selector de Forma de Pago (Efectivo / Transferencia / Mixto) + Switch Ya pagó */}
            <div className="flex items-center justify-between gap-2">
              <div className="grid grid-cols-3 gap-1 flex-1">
                {(
                  [
                    { id: 'efectivo', label: 'Efectivo', Icono: Banknote },
                    { id: 'transferencia', label: 'Transf.', Icono: Building2 },
                    { id: 'mixto', label: 'Mixto', Icono: Split },
                  ] as const
                ).map(({ id, label, Icono }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setModoPago(id);
                      if (id === 'mixto') {
                        setPagado(true);
                        if (!efectivoMixtoTexto && total > 0) {
                          setEfectivoMixtoTexto(String(Math.floor(total / 2)));
                        }
                      }
                    }}
                    className={cn(
                      'h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98]',
                      modoPago === id
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <Icono className="size-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 h-9 shrink-0"
                title={
                  pagado
                    ? 'El cliente paga ahora en mostrador (suma a la caja)'
                    : 'Queda pendiente de cobro al entregar'
                }
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    pagado ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {pagado ? 'Pagado' : 'A cobrar'}
                </span>
                <Switch
                  checked={pagado}
                  onCheckedChange={(checked) => {
                    setPagado(checked);
                    if (!checked && modoPago === 'mixto') setModoPago('efectivo');
                  }}
                />
              </div>
            </div>

            {/* Bloque de Pago Mixto en 1 paso (Efectivo + Transferencia/MP) */}
            {modoPago === 'mixto' && total > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <Label htmlFor="pm-mixto-efec" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Efectivo en mano
                    </Label>
                    <div className="relative mt-0.5">
                      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        $
                      </span>
                      <Input
                        id="pm-mixto-efec"
                        type="text"
                        inputMode="numeric"
                        value={efectivoMixtoTexto}
                        onChange={(e) => setEfectivoMixtoTexto(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        className="pl-6 h-9 rounded-xl text-sm font-black bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/90 dark:border-blue-900 dark:bg-blue-950/40 px-2.5 py-1.5">
                    <span className="block text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300">
                      Resto Transf. / MP
                    </span>
                    <span className="text-base font-black tabular-nums text-blue-700 dark:text-blue-200">
                      {formatARS(transferenciaMixtoNum)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Atajos táctiles de cobro en efectivo y Vuelto Gigante */}
            {modoPago === 'efectivo' && total > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagaConTexto(String(total))}
                    className={cn(
                      'h-8 rounded-lg px-2 text-[11px] font-bold border transition active:scale-95 shrink-0',
                      pagaConNum === total
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    )}
                  >
                    Pago exacto
                  </button>
                  {BILLETES_RAPIDOS.map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      onClick={() => setPagaConTexto(String(billete))}
                      className={cn(
                        'h-8 rounded-lg px-2 text-[11px] font-bold border transition active:scale-95 shrink-0 tabular-nums',
                        pagaConNum === billete
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                      )}
                    >
                      {formatARS(billete)}
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[78px]">
                    <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      $
                    </span>
                    <Input
                      id="pm-pagacon"
                      type="text"
                      inputMode="numeric"
                      value={pagaConTexto}
                      onChange={(e) => setPagaConTexto(e.target.value.replace(/\D/g, ''))}
                      placeholder="Otro…"
                      aria-label="Con cuánto paga el cliente"
                      className="pl-5 pr-6 h-8 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                    {pagaConTexto && (
                      <button
                        type="button"
                        onClick={() => setPagaConTexto('')}
                        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Indicador de Vuelto en Tipografía Gigante */}
                {pagaConNum !== undefined && (
                  <div
                    className={cn(
                      'rounded-xl px-3 py-2 flex items-center justify-between border',
                      montoVuelto > 0
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                        : pagaConNum === total
                          ? 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700'
                          : 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-wider">
                      {montoVuelto > 0
                        ? 'Vuelto:'
                        : pagaConNum === total
                          ? 'Pago exacto'
                          : 'Falta cubrir:'}
                    </span>
                    <span
                      className={cn(
                        'text-2xl leading-none font-black tabular-nums',
                        montoVuelto > 0 && 'text-emerald-700 dark:text-emerald-300',
                      )}
                    >
                      {montoVuelto > 0
                        ? formatARS(montoVuelto)
                        : pagaConNum === total
                          ? '$0'
                          : formatARS(total - pagaConNum)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs font-bold text-destructive">
                {error}
              </div>
            )}

            {/* Total y Botón Principal de Confirmación */}
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total comanda
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
                  {formatARS(total)}
                </span>
              </div>

              <Button
                size="lg"
                className="h-12 px-6 text-sm md:text-base font-black bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-40"
                onClick={() => void enviar()}
                disabled={!puedeEnviar}
                title="Atajo rápido: F12 o Ctrl+Enter"
              >
                <Check className="size-5" />
                <span>{enviando ? 'Cargando…' : 'Confirmar y enviar'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* DIÁLOGO DE PERSONALIZACIÓN Y QUITAR INGREDIENTES */}
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

/** Azulejo táctil de plato con miniatura visual: 1 toque suma directo, botón tijera personaliza */
function AzulejoPlato(props: {
  nombre: string;
  precio: number;
  fotoUrl?: string | undefined;
  cantidadEnTicket?: number | undefined;
  esPromo?: boolean;
  agotado?: boolean;
  conOpciones?: boolean;
  permitePersonalizar?: boolean;
  onClick: () => void;
  onPersonalizar?: () => void;
}) {
  const enTicket = props.cantidadEnTicket ?? 0;

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
        'group relative flex min-h-[104px] flex-col justify-between rounded-2xl border p-2.5 text-left transition-all active:scale-[0.98] shadow-xs cursor-pointer select-none bg-white dark:bg-slate-900',
        enTicket > 0
          ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white'
          : props.esPromo
            ? 'border-orange-500/40 bg-orange-500/5 hover:border-orange-500 dark:bg-orange-500/10'
            : 'border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600',
        props.agotado && 'opacity-40 grayscale pointer-events-none cursor-not-allowed',
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Miniatura cuadrada nítida del plato */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          {props.fotoUrl ? (
            <Image
              src={props.fotoUrl}
              alt={props.nombre}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : props.esPromo ? (
            <Flame className="size-5 text-orange-500/70" />
          ) : (
            <Utensils className="size-4 text-slate-400" />
          )}
          {enTicket > 0 && (
            <span className="absolute -top-1 -left-1 rounded-br-lg bg-slate-900 dark:bg-white px-1.5 py-0.2 text-[10px] font-black text-white dark:text-slate-950 shadow-xs">
              {enTicket}×
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between gap-1">
          <span className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
            {props.nombre}
          </span>
          {props.permitePersonalizar && !props.agotado && (
            <button
              type="button"
              title="Quitar ingredientes o agregar extras"
              onClick={(e) => {
                e.stopPropagation();
                props.onPersonalizar?.();
              }}
              className="shrink-0 size-7 -mt-0.5 -mr-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition"
            >
              <Scissors className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-1 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-white">
          {formatARS(props.precio)}
        </span>
        <div className="flex items-center gap-1.5">
          {props.conOpciones && (
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 text-[10px] font-semibold">
              Elegir
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

/** Diálogo táctil para variantes, extras y QUITAR INGREDIENTES */
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

  const [sinIngredientes, setSinIngredientes] = useState<string[]>(
    () => lineaInicial?.sinIngredientes ?? [],
  );
  const [notaLibre, setNotaLibre] = useState(() => lineaInicial?.notaExtra ?? '');

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

        {/* 3. QUITAR INGREDIENTES */}
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
                Sale completo con todos los ingredientes. Tocá para quitar:
              </span>
            ) : (
              <span className="text-rose-700 dark:text-rose-400 font-semibold">
                Se sacará de la comanda: {sinIngredientes.join(', ')}
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
                  <span>{quitado ? 'SIN' : 'Quitar'}</span>
                  <span>{ing}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Aclaración extra para la cocina */}
        <div className="space-y-1.5">
          <Label
            htmlFor="dp-nota"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Aclaración extra de cocina (opcional)
          </Label>
          <Input
            id="dp-nota"
            value={notaLibre}
            onChange={(e) => setNotaLibre(e.target.value.slice(0, 150))}
            placeholder="Ej.: bien cocido, sin sal en las papas, cortar al medio…"
            className="h-11 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>

        {notaFinalCocina && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            AVISO EN COMANDA: “{notaFinalCocina}”
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
