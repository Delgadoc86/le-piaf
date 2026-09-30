'use client';

/**
 * Seguimiento en vivo de un pedido web (/pedido/[token]). Escucha el espejo público
 * seguimiento/{token}: número, estado, tiempo estimado, ítems y total. Sin datos personales.
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Check,
  ChefHat,
  CircleX,
  Clock,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import {
  formatARS,
  mensajeConfirmacionWhatsApp,
  puedeCancelarCliente,
  type EstadoPedido,
  type Seguimiento,
  type TipoPedido,
} from '@app/shared';
import { linkWhatsApp } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { IconoWhatsApp } from './iconos-marca';

interface DatosLocal {
  nombre: string;
  logoUrl: string;
  whatsapp: string;
  alias: string;
  titular: string;
  direccion: string;
  mapsUrl: string;
}

type Carga =
  | { estado: 'cargando' }
  | { estado: 'no-existe' }
  | { estado: 'error' }
  | { estado: 'ok'; pedido: Seguimiento };

interface Paso {
  estados: readonly EstadoPedido[];
  titulo: string;
  icono: typeof Check;
}

function pasosPara(tipo: TipoPedido): Paso[] {
  return [
    { estados: ['pendiente'], titulo: 'Recibido', icono: ShoppingBag },
    { estados: ['aceptado', 'en_preparacion'], titulo: 'En preparación', icono: ChefHat },
    {
      estados: ['listo'],
      titulo: tipo === 'take_away' ? 'Listo para retirar' : 'Listo',
      icono: PackageCheck,
    },
    ...(tipo === 'delivery'
      ? [{ estados: ['en_camino'] as const, titulo: 'En camino', icono: Truck }]
      : []),
    { estados: ['entregado'], titulo: 'Entregado', icono: Check },
  ];
}

const TITULAR: Partial<Record<EstadoPedido, string>> = {
  pendiente: 'Recibimos tu pedido',
  aceptado: 'Aceptamos tu pedido',
  en_preparacion: 'Lo estamos preparando',
  listo: '¡Tu pedido está listo!',
  en_camino: 'Tu pedido va en camino',
  entregado: '¡Que lo disfrutes!',
  rechazado: 'No pudimos tomar tu pedido',
  cancelado: 'Tu pedido se canceló',
};

export function SeguimientoPedido({ local }: { local: DatosLocal }) {
  const { token } = useParams<{ token: string }>();
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });

  useEffect(() => {
    let dejar: (() => void) | undefined;
    let activo = true;
    void import('@/lib/firebase/publico')
      .then(({ escucharSeguimiento }) =>
        escucharSeguimiento(
          token,
          (pedido) => setCarga(pedido ? { estado: 'ok', pedido } : { estado: 'no-existe' }),
          () => setCarga({ estado: 'error' }),
        ),
      )
      .then((d) => {
        if (activo) dejar = d;
        else d();
      })
      .catch(() => setCarga({ estado: 'error' }));
    return () => {
      activo = false;
      dejar?.();
    };
  }, [token]);

  return (
    <div className="resplandor flex min-h-dvh flex-col items-center px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Link href="/" className="mb-6 rounded-full focus-visible:ring-2 focus-visible:ring-marca">
        {local.logoUrl ? (
          <Image
            src={local.logoUrl}
            alt={local.nombre}
            width={300}
            height={200}
            className="h-12 w-auto"
          />
        ) : (
          <span className="font-titulos text-2xl">{local.nombre}</span>
        )}
      </Link>

      <main className="w-full max-w-md">
        {carga.estado === 'cargando' && <Esqueleto />}
        {carga.estado === 'no-existe' && (
          <Aviso
            titulo="No encontramos ese pedido"
            texto="Revisá el link o escribinos por WhatsApp y te ayudamos."
            local={local}
          />
        )}
        {carga.estado === 'error' && (
          <Aviso
            titulo="No pudimos cargar tu pedido"
            texto="Revisá la conexión y recargá la página."
            local={local}
          />
        )}
        {carga.estado === 'ok' && <Detalle pedido={carga.pedido} local={local} />}
      </main>
    </div>
  );
}

function Detalle({ pedido, local }: { pedido: Seguimiento; local: DatosLocal }) {
  const anulado = pedido.estado === 'cancelado' || pedido.estado === 'rechazado';
  const pasos = pasosPara(pedido.tipo);
  const actual = pasos.findIndex((p) => p.estados.includes(pedido.estado));
  const terminado = pedido.estado === 'entregado';
  const mensaje = `Hola ${local.nombre}, te escribo por mi pedido #${pedido.numero}.`;
  const sinConfirmar = pedido.porConfirmar === true && pedido.estado === 'pendiente';

  return (
    <div className="space-y-4">
      {sinConfirmar && <Confirmar pedido={pedido} local={local} />}
      <section
        className="rounded-[28px] border border-borde bg-superficie p-6 text-center"
        aria-live="polite"
      >
        <p className="text-xs font-semibold tracking-[0.25em] text-tinta-2 uppercase">
          Pedido #{pedido.numero}
        </p>
        <h1 className="mt-2 font-titulos text-4xl leading-tight">
          {TITULAR[pedido.estado] ?? 'Tu pedido'}
        </h1>
        {anulado ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-tinta-2">
            <CircleX className="size-5 shrink-0 text-red-400" aria-hidden />
            {pedido.canceladoPor === 'vencido'
              ? 'Se canceló porque no lo confirmaste por WhatsApp a tiempo. Podés hacer uno nuevo.'
              : pedido.canceladoPor === 'cliente'
                ? 'Cancelaste este pedido.'
                : pedido.motivoCancelacion || 'Escribinos si tenés alguna duda.'}
          </p>
        ) : (
          ['pendiente', 'aceptado', 'en_preparacion'].includes(pedido.estado) &&
          pedido.tiempoEstimadoMin !== undefined &&
          pedido.tiempoEstimadoMin > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-marca/10 px-4 py-1.5 text-sm text-marca">
              <Clock className="size-4" aria-hidden /> Demora estimada: {pedido.tiempoEstimadoMin}{' '}
              min
            </p>
          )
        )}

        {!anulado && (
          <ol className="mt-6 space-y-0 text-left">
            {pasos.map((p, i) => {
              const hecho = i < actual || terminado;
              const enCurso = i === actual && !terminado;
              const Icono = p.icono;
              return (
                <li key={p.titulo} className="relative flex items-center gap-3 pb-5 last:pb-0">
                  {i < pasos.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute top-9 left-[17px] h-[calc(100%-28px)] w-0.5',
                        hecho ? 'bg-marca' : 'bg-borde',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border',
                      hecho && 'border-marca bg-marca text-black',
                      enCurso && 'border-marca text-marca',
                      !hecho && !enCurso && 'border-borde text-tinta-2/50',
                    )}
                  >
                    {enCurso && (
                      <span
                        aria-hidden
                        className="latido absolute inset-0 rounded-full bg-marca/40"
                      />
                    )}
                    <Icono className="relative size-4" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      !hecho && !enCurso && 'text-tinta-2/60',
                      enCurso && 'text-tinta',
                    )}
                  >
                    {p.titulo}
                    {enCurso && <span className="sr-only"> (estado actual)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="rounded-[28px] border border-borde bg-superficie p-5">
        <h2 className="mb-3 text-sm font-semibold text-tinta-2">Tu pedido</h2>
        <ul className="space-y-1.5">
          {pedido.items.map((i, n) => (
            <li key={n} className="flex gap-2">
              <span className="font-semibold text-marca tabular-nums">{i.cantidad}×</span>
              <span>{i.nombre}</span>
            </li>
          ))}
        </ul>
        {pedido.tipo === 'delivery' && (
          <div className="mt-4 flex items-baseline justify-between border-t border-borde pt-3 text-sm">
            <span className="text-tinta-2">🛵 Envío</span>
            {pedido.costoEnvio ? (
              <span className="tabular-nums">{formatARS(pedido.costoEnvio)}</span>
            ) : (
              <span className="text-marca">A confirmar por WhatsApp</span>
            )}
          </div>
        )}
        <div
          className={cn(
            'flex items-baseline justify-between pt-3',
            pedido.tipo === 'delivery' ? 'mt-1' : 'mt-4 border-t border-borde',
          )}
        >
          <span className="text-tinta-2">
            {pedido.tipo === 'delivery' && !pedido.costoEnvio ? 'Total sin envío' : 'Total'}
          </span>
          <span className="text-xl font-bold tabular-nums">{formatARS(pedido.total)}</span>
        </div>
        <p className="mt-2 text-sm text-tinta-2">
          {pedido.estadoPago === 'pagado' ? (
            <span className="text-emerald-400">✓ Pagado</span>
          ) : pedido.medioPago === 'transferencia' ? (
            local.alias ? (
              <>
                Pagás por transferencia a <strong className="text-tinta">{local.alias}</strong>
                {local.titular && <> ({local.titular})</>}.
              </>
            ) : (
              'Pagás por transferencia.'
            )
          ) : pedido.tipo === 'delivery' ? (
            'Pagás en efectivo al recibir.'
          ) : (
            'Pagás en efectivo al retirar.'
          )}
        </p>
      </section>

      {pedido.tipo !== 'delivery' && local.direccion && (
        <a
          href={local.mapsUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-[28px] border border-borde bg-superficie p-5 hover:border-marca/50"
        >
          <MapPin className="size-5 shrink-0 text-marca" aria-hidden />
          <span>
            <span className="block text-sm text-tinta-2">Retirás en</span>
            {local.direccion}
          </span>
        </a>
      )}

      <a
        href={linkWhatsApp(local.whatsapp, mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-full border border-borde font-medium hover:bg-white/5"
      >
        <IconoWhatsApp className="size-5 text-[#25D366]" /> Escribirle al local
      </a>
      {puedeCancelarCliente(pedido.estado) && <CancelarPedido />}
      <Link href="/" className="block text-center text-sm text-tinta-2 underline">
        Volver a la carta
      </Link>
    </div>
  );
}

/** Cliente nuevo: confirmar por WhatsApp antes de que venza (lo cancela el servidor si no). */
function Confirmar({ pedido, local }: { pedido: Seguimiento; local: DatosLocal }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const vence = pedido.confirmarAntesDe?.toMillis();
  const restante = vence ? Math.max(0, vence - ahora) : null;
  const min = restante !== null ? Math.floor(restante / 60_000) : null;
  const seg = restante !== null ? Math.floor((restante % 60_000) / 1000) : null;
  const mensaje = mensajeConfirmacionWhatsApp(local.nombre, {
    numero: pedido.numero,
    nombre: '',
    total: pedido.total,
    linkSeguimiento: typeof window === 'undefined' ? undefined : window.location.href,
  });
  return (
    <section className="rounded-[28px] border-2 border-[#25D366] bg-superficie p-5 text-center">
      <p className="font-semibold">Confirmá tu pedido por WhatsApp</p>
      <p className="mt-1 text-sm text-tinta-2">
        Es tu primer pedido: mandanos el mensaje ya escrito para que empecemos a prepararlo.
      </p>
      {restante !== null && (
        <p className="mt-2 text-sm text-marca tabular-nums">
          {restante > 0
            ? `⏱ Te quedan ${min}:${String(seg).padStart(2, '0')} para confirmarlo`
            : 'Se venció el tiempo: en unos minutos se cancela.'}
        </p>
      )}
      <a
        href={linkWhatsApp(local.whatsapp, mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white"
      >
        <IconoWhatsApp className="size-5" /> Confirmar por WhatsApp
      </a>
    </section>
  );
}

/** El cliente cancela mientras el local todavía no aceptó el pedido. */
function CancelarPedido() {
  const { token } = useParams<{ token: string }>();
  const [paso, setPaso] = useState<'inicio' | 'seguro' | 'enviando'>('inicio');
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    setPaso('enviando');
    setError(null);
    try {
      const { cancelarPedidoCliente, mensajeErrorPedido } = await import('@/lib/firebase/publico');
      try {
        await cancelarPedidoCliente(token);
      } catch (e) {
        setError(mensajeErrorPedido(e));
        setPaso('inicio');
      }
    } catch {
      setError('No pudimos cancelar. Probá de nuevo.');
      setPaso('inicio');
    }
  }

  return (
    <div className="text-center">
      {paso === 'inicio' ? (
        <button
          type="button"
          onClick={() => setPaso('seguro')}
          className="text-sm text-tinta-2 underline hover:text-tinta"
        >
          Cancelar mi pedido
        </button>
      ) : (
        <div className="rounded-2xl border border-borde bg-superficie p-4">
          <p className="text-sm">¿Seguro que querés cancelar el pedido?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPaso('inicio')}
              disabled={paso === 'enviando'}
              className="h-10 flex-1 rounded-full border border-borde text-sm"
            >
              No, seguir
            </button>
            <button
              type="button"
              onClick={() => void cancelar()}
              disabled={paso === 'enviando'}
              className="h-10 flex-1 rounded-full bg-red-600 text-sm font-semibold text-white disabled:opacity-60"
            >
              {paso === 'enviando' ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

function Aviso({ titulo, texto, local }: { titulo: string; texto: string; local: DatosLocal }) {
  return (
    <section className="rounded-[28px] border border-borde bg-superficie p-6 text-center">
      <h1 className="font-titulos text-3xl">{titulo}</h1>
      <p className="mt-2 text-tinta-2">{texto}</p>
      <a
        href={linkWhatsApp(local.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-borde px-6 font-medium"
      >
        <IconoWhatsApp className="size-5 text-[#25D366]" /> WhatsApp
      </a>
    </section>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando tu pedido">
      <div className="h-80 animate-pulse rounded-[28px] bg-superficie" />
      <div className="h-40 animate-pulse rounded-[28px] bg-superficie" />
    </div>
  );
}
