'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  DOC_LOCAL,
  formatARS,
  resumirDias,
  type LocalEditable,
  type ProductoDatos,
  type PromoDatos,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  EncabezadoPagina,
  IndicadorGuardado,
  ListaOrdenable,
  useGuardado,
} from '@/components/panel/ui-panel';
import {
  FormularioPromo,
  promoVacia,
  type PromoEditable,
} from '@/components/panel/formulario-promo';
import {
  alternarPromoActiva,
  eliminarPromo,
  reordenar,
  siguienteOrden,
} from '@/features/panel/carta';
import { EditorBanner } from '@/components/panel/editor-banner';
import { useSesion } from '@/features/auth/sesion';
import { useColeccion, useDocumento } from '@/features/panel/firestore';

function textoVigencia(p: PromoDatos): string {
  const v = p.vigencia;
  if (!v) return 'Siempre';
  const partes = [v.dias.length ? resumirDias(v.dias) : 'Todos los días'];
  if (v.desde || v.hasta) partes.push(`${v.desde ?? '00:00'} a ${v.hasta ?? '24:00'}`);
  if (v.fechaFin) partes.push(`hasta el ${v.fechaFin.split('-').reverse().join('/')}`);
  return partes.join(' · ');
}

export default function PromosPage() {
  const promos = useColeccion<PromoDatos>('promos');
  const productos = useColeccion<ProductoDatos>('productos');
  const [editando, setEditando] = useState<PromoEditable | null>(null);
  const [borrando, setBorrando] = useState<(PromoDatos & { id: string }) | null>(null);
  const { estado, guardar } = useGuardado();
  const sesion = useSesion();
  const local = useDocumento<LocalEditable>(DOC_LOCAL);
  const esDueno = sesion.estado === 'lista' && sesion.rol === 'dueno';

  return (
    <div className="max-w-4xl space-y-8">
      <EncabezadoPagina
        titulo="Promos"
        descripcion="La primera activa sale destacada en la web. Arrastrá para cambiar el orden."
        acciones={
          <>
            <IndicadorGuardado estado={estado} />
            <Button onClick={() => setEditando(promoVacia(siguienteOrden(promos.datos)))}>
              <Plus className="size-4" /> Nueva promo
            </Button>
          </>
        }
      />
      {/* El banner vive en local/datos: lo edita el dueño. */}
      {esDueno && local.datos && <EditorBanner banner={local.datos.banner} />}
      {promos.cargando ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : promos.datos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Todavía no hay promos.
        </p>
      ) : (
        <ListaOrdenable
          items={promos.datos}
          onReordenar={(ids) => void guardar(() => reordenar('promos', ids))}
          render={(p, manija) => (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-2 pr-3">
              {manija}
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.fotoUrl ? (
                  <Image src={p.fotoUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <ImageOff
                    className="absolute inset-0 m-auto size-5 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <button
                className="min-w-0 flex-1 basis-40 text-left"
                onClick={() => setEditando({ ...p })}
              >
                <p className="truncate font-medium">{p.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="tabular-nums">{formatARS(p.precio)}</span> · {textoVigencia(p)}
                </p>
              </button>
              <div className="flex items-center gap-1 max-sm:w-full max-sm:justify-between max-sm:border-t max-sm:pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{p.activa ? 'Activa' : 'Pausada'}</span>
                  <Switch
                    checked={p.activa}
                    onCheckedChange={(c) => void guardar(() => alternarPromoActiva(p.id, c))}
                    aria-label={`${p.titulo} activa`}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${p.titulo}`}
                  onClick={() => setEditando({ ...p })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Borrar ${p.titulo}`}
                  onClick={() => setBorrando(p)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )}
        />
      )}

      <FormularioPromo
        promo={editando}
        productos={productos.datos}
        onCerrar={() => setEditando(null)}
      />

      <AlertDialog open={borrando !== null} onOpenChange={(a) => !a && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar “{borrando?.titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Si es temporal, mejor pausala con el interruptor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (borrando) void guardar(() => eliminarPromo(borrando.id));
                setBorrando(null);
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
