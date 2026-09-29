'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Lock, LockOpen } from 'lucide-react';
import {
  CATEGORIAS_MOVIMIENTO,
  DOC_LOCAL,
  diferenciaCaja,
  esperadoCaja,
  formatARS,
  type CategoriaMovimiento,
  type Local,
  type PorMedio,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bloque, EncabezadoPagina, InputPesos } from '@/components/panel/ui-panel';
import { useSesion } from '@/features/auth/sesion';
import { mensajeError, useDocumento } from '@/features/panel/firestore';
import {
  abrirCaja,
  anotarMovimiento,
  cerrarCaja,
  ETIQUETA_CATEGORIA,
  useCajaAbierta,
  useCierres,
  useMovimientos,
  type TurnoConId,
} from '@/features/panel/caja';
import { cn } from '@/lib/utils';

function fechaHora(ts: { toDate(): Date } | null | undefined, zona: string): string {
  if (!ts) return '';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: zona,
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts.toDate());
}

export default function CajaPage() {
  const local = useDocumento<Local>(DOC_LOCAL);
  const zona = local.datos?.zonaHoraria ?? 'America/Argentina/Buenos_Aires';
  const { turno, cargando } = useCajaAbierta();

  return (
    <div className="max-w-4xl space-y-6">
      <EncabezadoPagina
        titulo="Caja"
        descripcion="Abrí la caja al empezar, anotá gastos o retiros de efectivo y cerrala contando la plata."
      />
      {cargando ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : turno ? (
        <CajaAbierta turno={turno} zona={zona} />
      ) : (
        <AbrirCaja />
      )}
      <Historial zona={zona} />
    </div>
  );
}

function AbrirCaja() {
  const [monto, setMonto] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setEnviando(true);
    setError(null);
    try {
      await abrirCaja({ montoInicial: monto });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Bloque titulo="La caja está cerrada" descripcion="¿Con cuánto efectivo arrancás (el cambio)?">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1.5">
          <Label htmlFor="monto-inicial">Efectivo inicial</Label>
          <InputPesos id="monto-inicial" valor={monto} onCambio={setMonto} />
        </div>
        <Button onClick={() => void abrir()} disabled={enviando}>
          <LockOpen /> Abrir caja
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Bloque>
  );
}

function CajaAbierta({ turno, zona }: { turno: TurnoConId; zona: string }) {
  const sesion = useSesion();
  const uid = sesion.estado === 'lista' ? sesion.usuario.uid : '';
  const movimientos = useMovimientos(turno.id);
  const [cerrando, setCerrando] = useState(false);
  const esperado = esperadoCaja(turno, movimientos.datos);
  const neto = esperado.efectivo - turno.montoInicial - turno.totales.efectivo;

  return (
    <>
      <section className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Abierta
            </span>
            desde {fechaHora(turno.abiertoEn, zona)} · {turno.abiertoPorNombre}
          </p>
          <Button variant="outline" onClick={() => setCerrando(true)}>
            <Lock /> Cerrar caja
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Dato titulo="Efectivo en caja" valor={formatARS(esperado.efectivo)} destacado>
            Inicial {formatARS(turno.montoInicial)} + cobros {formatARS(turno.totales.efectivo)}
            {neto !== 0 && ` ${neto > 0 ? '+' : '−'} ${formatARS(Math.abs(neto))} movimientos`}
          </Dato>
          <Dato titulo="Transferencias" valor={formatARS(turno.totales.transferencia)} />
          <Dato titulo="Pedidos cobrados" valor={String(turno.cantidadPedidos)} />
        </div>
      </section>

      <Bloque
        titulo="Movimientos de efectivo"
        descripcion="Pagos a proveedores, retiros o cambio que entra. No se pueden borrar: si te equivocás, anotá el movimiento contrario."
      >
        <FormMovimiento turnoId={turno.id} uid={uid} />
        {movimientos.datos.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border">
            {movimientos.datos.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3 text-sm">
                {m.tipo === 'egreso' ? (
                  <ArrowUpRight className="size-4 shrink-0 text-destructive" aria-label="Egreso" />
                ) : (
                  <ArrowDownLeft
                    className="size-4 shrink-0 text-emerald-600"
                    aria-label="Ingreso"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ETIQUETA_CATEGORIA[m.categoria]}</p>
                  {m.detalle && <p className="truncate text-muted-foreground">{m.detalle}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{fechaHora(m.en, zona)}</span>
                <span className="w-24 text-right font-medium tabular-nums">
                  {m.tipo === 'egreso' ? '−' : '+'}
                  {formatARS(m.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <DialogoCierre abierto={cerrando} onCerrar={() => setCerrando(false)} esperado={esperado} />
    </>
  );
}

function FormMovimiento({ turnoId, uid }: { turnoId: string; uid: string }) {
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>('egreso');
  const [categoria, setCategoria] = useState<CategoriaMovimiento>('proveedor');
  const [monto, setMonto] = useState(0);
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function anotar() {
    setEnviando(true);
    setError(null);
    try {
      await anotarMovimiento(turnoId, { tipo, categoria, monto, detalle: detalle.trim() }, uid);
      setMonto(0);
      setDetalle('');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(['egreso', 'ingreso'] as const).map((t) => (
          <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)}>
            {t === 'egreso' ? 'Sale plata' : 'Entra plata'}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden />
        {CATEGORIAS_MOVIMIENTO.map((c) => (
          <Chip key={c} activo={categoria === c} onClick={() => setCategoria(c)}>
            {ETIQUETA_CATEGORIA[c]}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-36 space-y-1">
          <Label htmlFor="mov-monto">Monto</Label>
          <InputPesos id="mov-monto" valor={monto} onCambio={setMonto} />
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="mov-detalle">Detalle</Label>
          <Input
            id="mov-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value.slice(0, 200))}
            placeholder="Ej.: pan de la panadería"
          />
        </div>
        <Button onClick={() => void anotar()} disabled={monto <= 0 || enviando}>
          Anotar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function DialogoCierre({
  abierto,
  onCerrar,
  esperado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  esperado: PorMedio;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        {abierto && <FormCierre esperado={esperado} onListo={onCerrar} />}
      </DialogContent>
    </Dialog>
  );
}

function FormCierre({ esperado, onListo }: { esperado: PorMedio; onListo: () => void }) {
  const [efectivo, setEfectivo] = useState(0);
  const [transferencia, setTransferencia] = useState(esperado.transferencia);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contoEfectivo, setContoEfectivo] = useState(false);
  const dif = diferenciaCaja(esperado, { efectivo, transferencia });

  async function cerrar() {
    setEnviando(true);
    setError(null);
    try {
      await cerrarCaja({
        contado: { efectivo, transferencia },
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      onListo();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cerrar caja</DialogTitle>
        <DialogDescription>
          Contá la plata y anotá lo que hay. Te mostramos si falta o sobra.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cierre-efectivo">Efectivo contado</Label>
          <InputPesos
            id="cierre-efectivo"
            valor={efectivo}
            onCambio={(n) => {
              setEfectivo(n);
              setContoEfectivo(true);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Tendría que haber {formatARS(esperado.efectivo)}.
          </p>
          {contoEfectivo && <Diferencia valor={dif.efectivo} />}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cierre-transf">Transferencias recibidas</Label>
          <InputPesos id="cierre-transf" valor={transferencia} onCambio={setTransferencia} />
          <p className="text-xs text-muted-foreground">
            Cobradas en el sistema: {formatARS(esperado.transferencia)}. Revisalo contra la app del
            banco.
          </p>
          {dif.transferencia !== 0 && <Diferencia valor={dif.transferencia} />}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cierre-notas">Notas (opcional)</Label>
          <Textarea
            id="cierre-notas"
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value.slice(0, 500))}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button onClick={() => void cerrar()} disabled={enviando || !contoEfectivo}>
          {enviando ? 'Cerrando…' : 'Cerrar caja'}
        </Button>
      </DialogFooter>
    </>
  );
}

function Diferencia({ valor }: { valor: number }) {
  if (valor === 0) {
    return <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✓ Da justo</p>;
  }
  return (
    <p
      className={cn(
        'text-sm font-medium',
        valor < 0 ? 'text-destructive' : 'text-amber-700 dark:text-amber-300',
      )}
    >
      {valor < 0 ? 'Faltan' : 'Sobran'} {formatARS(Math.abs(valor))}
    </p>
  );
}

function Historial({ zona }: { zona: string }) {
  const cierres = useCierres();
  if (cierres.cargando || cierres.datos.length === 0) return null;
  return (
    <Bloque titulo="Cierres anteriores">
      <ul className="divide-y rounded-lg border">
        {cierres.datos.map((t) => {
          const dif = t.diferencia?.efectivo ?? 0;
          return (
            <li key={t.id} className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium capitalize">
                  {fechaHora(t.abiertoEn, zona)} → {fechaHora(t.cerradoEn, zona)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    dif === 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : dif < 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
                  )}
                >
                  {dif === 0
                    ? 'Justo'
                    : `${dif < 0 ? 'Faltaron' : 'Sobraron'} ${formatARS(Math.abs(dif))}`}
                </span>
              </div>
              <p className="text-muted-foreground">
                {t.cantidadPedidos} pedidos · efectivo contado {formatARS(t.contado?.efectivo ?? 0)}{' '}
                de {formatARS(t.esperado?.efectivo ?? 0)} · transferencias{' '}
                {formatARS(t.totales.transferencia)}
                {t.cerradoPorNombre && ` · cerró ${t.cerradoPorNombre}`}
              </p>
              {t.notas && <p className="italic">“{t.notas}”</p>}
            </li>
          );
        })}
      </ul>
    </Bloque>
  );
}

function Dato(props: {
  titulo: string;
  valor: string;
  destacado?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-3', props.destacado && 'border-primary/40')}>
      <p className="text-xs text-muted-foreground">{props.titulo}</p>
      <p className="text-2xl font-semibold tabular-nums">{props.valor}</p>
      {props.children && <p className="mt-1 text-xs text-muted-foreground">{props.children}</p>}
    </div>
  );
}

function Chip(props: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.activo}
      onClick={props.onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-sm transition-colors',
        props.activo ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
      )}
    >
      {props.children}
    </button>
  );
}
