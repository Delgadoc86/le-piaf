'use client';

/**
 * Carrito + datos de entrega + envío del pedido por WhatsApp.
 * Paso intermedio: en la Fase 2 el mismo formulario llama a crearPedido en vez de abrir WhatsApp.
 */
import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { AlertTriangle, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  estaAbierto,
  formatARS,
  mensajePedidoWhatsApp,
  type MedioPagoWeb,
  type TipoPedido,
  type TotalesPedido,
} from '@app/shared';
import { useCarrito, useTiendaUI } from '@/features/carrito/store';
import { useLineasCarrito, useTienda } from '@/features/carrito/tienda';
import { linkWhatsApp } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { IconoWhatsApp } from '../iconos-marca';
import { Contador } from './hoja-producto';
import { Miniatura } from './ilustracion';

const ETIQUETA_TIPO: Record<TipoPedido, string> = { take_away: 'Retiro', delivery: 'Delivery', salon: 'En el local' };
const CLAVE_DATOS = 'datos-cliente-v1';

/** Nombre y dirección se recuerdan en este navegador para la próxima vez (comodidad, no es crítico). */
function leerDatosGuardados(): { nombre: string; direccion: string; referencia: string } {
  try {
    return { nombre: '', direccion: '', referencia: '', ...JSON.parse(localStorage.getItem(CLAVE_DATOS) ?? '{}') };
  } catch {
    return { nombre: '', direccion: '', referencia: '' };
  }
}

export function HojaCarrito() {
  const abierto = useTiendaUI((e) => e.carritoAbierto);
  const abrir = useTiendaUI((e) => e.abrirCarrito);
  return (
    <Dialog.Root open={abierto} onOpenChange={abrir}>
      <Dialog.Portal>
        <Dialog.Overlay className="velo fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="hoja hoja-lateral fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col overflow-hidden rounded-t-[28px] border border-borde bg-superficie font-texto text-tinta md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-[28px]"
        >
          <Contenido />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Contenido() {
  const tienda = useTienda();
  const { lineas, total, cantidad } = useLineasCarrito();
  const { cambiarCantidad, quitar, vaciar } = useCarrito();
  const abrir = useTiendaUI((e) => e.abrirCarrito);

  const tipos = (
    [
      ['take_away', tienda.pedidos.tipos.takeAway],
      ['delivery', tienda.pedidos.tipos.delivery],
      ['salon', tienda.pedidos.tipos.salon],
    ] as const
  )
    .filter(([, habilitado]) => habilitado)
    .map(([t]) => t as TipoPedido);
  const pagos = (
    [
      ['efectivo', tienda.pagos.efectivo],
      ['transferencia', tienda.pagos.transferencia.habilitado],
      ['mercadopago', tienda.pagos.mercadoPago.habilitado],
    ] as const
  )
    .filter(([, h]) => h)
    .map(([m]) => m as MedioPagoWeb);

  // El contenido solo se monta en el navegador al abrir el carrito: se puede leer localStorage acá.
  const [guardados] = useState(leerDatosGuardados);
  const [nombre, setNombre] = useState(guardados.nombre);
  const [tipo, setTipo] = useState<TipoPedido>(tipos[0] ?? 'take_away');
  const [direccion, setDireccion] = useState(guardados.direccion);
  const [referencia, setReferencia] = useState(guardados.referencia);
  const [pago, setPago] = useState<MedioPagoWeb>(pagos[0] ?? 'efectivo');
  const [pagaCon, setPagaCon] = useState('');
  const [nota, setNota] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [abiertoAhora] = useState(() => estaAbierto(tienda.horario));

  const validas = lineas.filter((l) => l.ok);
  const faltaMinimo = tienda.pedidos.pedidoMinimo > 0 && total < tienda.pedidos.pedidoMinimo;
  const faltaDireccion = tipo === 'delivery' && direccion.trim().length < 3;
  const puedeEnviar = validas.length > 0 && nombre.trim().length >= 2 && !faltaDireccion && !faltaMinimo;

  function enviar() {
    if (!puedeEnviar) return;
    const totales: TotalesPedido = {
      items: validas.map((l) => (l.ok ? l.linea : null)).filter((l) => l !== null),
      subtotal: total,
      descuento: 0,
      costoEnvio: 0,
      total,
    };
    const mensaje = mensajePedidoWhatsApp(tienda.nombreLocal, totales, {
      nombre,
      tipo,
      direccion,
      referencia,
      pago,
      pagaCon: Number(pagaCon.replace(/\D/g, '')) || undefined,
      nota,
    });
    try {
      localStorage.setItem(CLAVE_DATOS, JSON.stringify({ nombre, direccion, referencia }));
    } catch {
      // sin almacenamiento disponible: no pasa nada
    }
    window.open(linkWhatsApp(tienda.whatsapp, mensaje), '_blank', 'noopener');
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 pt-12 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <span className="tilde inline-flex size-16 items-center justify-center rounded-full bg-[#25D366] text-white">
          <IconoWhatsApp className="size-8" />
        </span>
        <Dialog.Title className="text-2xl font-semibold">¡Listo! Mandalo en WhatsApp</Dialog.Title>
        <p className="max-w-xs text-tinta-2">
          Se abrió WhatsApp con tu pedido armado. Tocá <strong>enviar</strong> y el local te confirma por ahí.
        </p>
        <div className="mt-4 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              vaciar();
              abrir(false);
            }}
            className="h-12 rounded-full bg-marca font-semibold text-black hover:bg-marca-hover"
          >
            Ya lo envié, vaciar carrito
          </button>
          <button type="button" onClick={() => setEnviado(false)} className="h-12 rounded-full border border-borde font-medium">
            Volver al pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-borde px-5 py-4">
        <Dialog.Title className="text-xl font-semibold">
          Tu pedido {cantidad > 0 && <span className="text-tinta-2">· {cantidad}</span>}
        </Dialog.Title>
        <Dialog.Close aria-label="Cerrar" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <X className="size-5" aria-hidden />
        </Dialog.Close>
      </header>

      {lineas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="ilustracion inline-flex size-20 items-center justify-center rounded-full text-marca">
            <ShoppingBag className="size-9" aria-hidden />
          </span>
          <p className="font-semibold">Tu pedido está vacío</p>
          <p className="text-sm text-tinta-2">Elegí algo rico de la carta.</p>
          <Dialog.Close className="mt-2 h-11 rounded-full bg-marca px-6 font-semibold text-black">Ver la carta</Dialog.Close>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-borde px-5">
            {lineas.map((l) =>
              l.ok ? (
                <li key={l.clave} className="flex gap-3 py-4">
                  <Miniatura
                    fotoUrl={
                      l.linea.tipo === 'producto' ? tienda.producto(l.linea.refId)?.fotoUrl : tienda.promo(l.linea.refId)?.fotoUrl
                    }
                    alt=""
                    icono={
                      l.linea.tipo === 'producto'
                        ? tienda.categoria(tienda.producto(l.linea.refId)?.categoriaId ?? '')?.icono
                        : undefined
                    }
                    sizes="64px"
                    className="size-16 shrink-0 rounded-xl"
                    iconoClassName="size-6"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{l.linea.nombre}</p>
                        {l.linea.varianteNombre && <p className="text-sm text-tinta-2">{l.linea.varianteNombre}</p>}
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatARS(l.linea.subtotal)}</p>
                    </div>
                    {l.linea.extras.length > 0 && (
                      <p className="text-xs text-tinta-2">+ {l.linea.extras.map((e) => e.nombre).join(', ')}</p>
                    )}
                    {l.linea.nota && <p className="text-xs text-tinta-2 italic">“{l.linea.nota}”</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <Contador chico valor={l.linea.cantidad} min={1} onCambio={(n) => cambiarCantidad(l.clave, n)} />
                      <button
                        type="button"
                        onClick={() => quitar(l.clave)}
                        aria-label={`Quitar ${l.linea.nombre}`}
                        className="inline-flex size-9 items-center justify-center rounded-full text-tinta-2 hover:bg-white/10 hover:text-tinta"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={l.clave} className="flex items-center gap-3 py-4 opacity-70">
                  <AlertTriangle className="size-5 shrink-0 text-marca" aria-hidden />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-tinta-2">{l.motivo}</p>
                  </div>
                  <button type="button" onClick={() => quitar(l.clave)} className="text-sm underline">
                    Quitar
                  </button>
                </li>
              ),
            )}
          </ul>

          <div className="space-y-5 border-t border-borde px-5 py-5">
            {tipos.length > 1 && (
              <Segmentado
                etiqueta="¿Cómo lo querés?"
                opciones={tipos.map((t) => ({ valor: t, texto: ETIQUETA_TIPO[t] }))}
                valor={tipo}
                onCambio={(v) => setTipo(v as TipoPedido)}
              />
            )}
            {tipos.length === 1 && tipo === 'take_away' && (
              <p className="rounded-2xl bg-fondo/50 px-4 py-3 text-sm text-tinta-2">🏪 Retirás en el local.</p>
            )}

            <Campo etiqueta="Tu nombre" valor={nombre} onCambio={setNombre} autoComplete="name" />
            {tipo === 'delivery' && (
              <>
                <Campo etiqueta="Dirección" valor={direccion} onCambio={setDireccion} autoComplete="street-address" />
                <Campo etiqueta="Referencia (opcional)" valor={referencia} onCambio={setReferencia} placeholder="Portón verde, timbre 2…" />
              </>
            )}

            {pagos.length > 1 && (
              <Segmentado
                etiqueta="¿Cómo pagás?"
                opciones={pagos.map((p) => ({
                  valor: p,
                  texto: p === 'efectivo' ? 'Efectivo' : p === 'transferencia' ? 'Transferencia' : 'Mercado Pago',
                }))}
                valor={pago}
                onCambio={(v) => setPago(v as MedioPagoWeb)}
              />
            )}
            {pago === 'efectivo' && (
              <Campo
                etiqueta="¿Con cuánto pagás? (opcional)"
                valor={pagaCon}
                onCambio={(v) => setPagaCon(v.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                placeholder="Para llevarte el vuelto"
              />
            )}
            {pago === 'transferencia' && tienda.pagos.transferencia.alias && (
              <p className="rounded-2xl bg-fondo/50 px-4 py-3 text-sm">
                Alias: <strong>{tienda.pagos.transferencia.alias}</strong>
                {tienda.pagos.transferencia.titular && <span className="text-tinta-2"> · {tienda.pagos.transferencia.titular}</span>}
              </p>
            )}
            <Campo etiqueta="Nota para el local (opcional)" valor={nota} onCambio={setNota} placeholder="Ej.: sin mayonesa" />
          </div>
        </div>
      )}

      {lineas.length > 0 && (
        <footer className="shrink-0 space-y-3 border-t border-borde bg-superficie px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!abiertoAhora && (
            <p className="flex items-center gap-2 rounded-xl bg-marca/10 px-3 py-2 text-xs text-marca">
              <AlertTriangle className="size-4 shrink-0" aria-hidden /> Ahora estamos cerrados: te respondemos apenas abramos.
            </p>
          )}
          {faltaMinimo && (
            <p className="text-xs text-marca">El pedido mínimo es {formatARS(tienda.pedidos.pedidoMinimo)}.</p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-tinta-2">Total</span>
            <span className="text-2xl font-bold tabular-nums">{formatARS(total)}</span>
          </div>
          <button
            type="button"
            onClick={enviar}
            disabled={!puedeEnviar}
            className="brillo relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <IconoWhatsApp className="size-5" />
            {nombre.trim().length < 2 ? 'Completá tu nombre' : faltaDireccion ? 'Completá la dirección' : 'Enviar pedido por WhatsApp'}
          </button>
        </footer>
      )}
    </>
  );
}

function Campo(props: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{props.etiqueta}</span>
      <input
        value={props.valor}
        onChange={(e) => props.onCambio(e.target.value.slice(0, 120))}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        className="h-12 w-full rounded-2xl border border-borde bg-fondo/50 px-4 text-base placeholder:text-tinta-2/60 focus:border-marca/60 focus:outline-none"
      />
    </label>
  );
}

function Segmentado(props: {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambio: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{props.etiqueta}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl border border-borde bg-fondo/50 p-1">
        {props.opciones.map((o) => (
          <label
            key={o.valor}
            className={cn(
              'flex h-10 cursor-pointer items-center justify-center rounded-xl text-sm font-medium transition-colors',
              props.valor === o.valor ? 'bg-marca text-black' : 'text-tinta-2 hover:text-tinta',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              checked={props.valor === o.valor}
              onChange={() => props.onCambio(o.valor)}
            />
            {o.texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
