'use client';

import type { CSSProperties } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  contraste,
  FUENTES,
  localEditableSchema,
  nivelContraste,
  type FuenteId,
  type LocalEditable,
  type Marca,
} from '@app/shared';
import { Input } from '@/components/ui/input';
import { fuentesDelLocal } from '@/lib/fuentes';
import { cn } from '@/lib/utils';
import { Bloque, CampoImagen } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({ marca: true });

const COLORES: { campo: keyof Marca; nombre: string; ayuda: string }[] = [
  { campo: 'colorPrimario', nombre: 'Principal', ayuda: 'Botones, precios, detalles' },
  {
    campo: 'colorPrimarioHover',
    nombre: 'Principal (al pasar el mouse)',
    ayuda: 'Un poco más oscuro',
  },
  { campo: 'colorFondo', nombre: 'Fondo', ayuda: 'Fondo de la página' },
  { campo: 'colorSuperficie', nombre: 'Tarjetas', ayuda: 'Fondo de tarjetas y fichas' },
  { campo: 'colorTexto', nombre: 'Texto', ayuda: 'Títulos y texto principal' },
  { campo: 'colorTextoSecundario', nombre: 'Texto secundario', ayuda: 'Descripciones' },
];

export function TabMarca({ local }: { local: LocalEditable }) {
  return (
    <FormularioSeccion esquema={esquema} inicial={{ marca: local.marca }}>
      {(f) => {
        const m = f.valor.marca;
        const set = (cambio: Partial<Marca>) => f.cambiar('marca', { ...m, ...cambio });
        const fuentes = fuentesDelLocal(m.fuenteTitulos, m.fuenteTexto);
        const chequeos = [
          { texto: 'Texto sobre el fondo', ratio: contraste(m.colorTexto, m.colorFondo) },
          {
            texto: 'Descripciones sobre las tarjetas',
            ratio: contraste(m.colorTextoSecundario, m.colorSuperficie),
          },
          {
            texto: 'Texto negro sobre el botón principal',
            ratio: contraste('#000000', m.colorPrimario),
          },
          {
            texto: 'Precios (color principal) sobre las tarjetas',
            ratio: contraste(m.colorPrimario, m.colorSuperficie),
          },
        ];
        return (
          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              <Bloque titulo="Colores">
                <div className="grid gap-3 sm:grid-cols-2">
                  {COLORES.map(({ campo, nombre, ayuda }) => (
                    <label key={campo} className="flex items-center gap-3 rounded-lg border p-2">
                      <input
                        type="color"
                        value={m[campo] as string}
                        onChange={(e) => set({ [campo]: e.target.value })}
                        className="size-10 shrink-0 cursor-pointer rounded border-0 bg-transparent"
                        aria-label={nombre}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{nombre}</span>
                        <span className="block text-xs text-muted-foreground">{ayuda}</span>
                      </span>
                      <Input
                        value={m[campo] as string}
                        onChange={(e) => set({ [campo]: e.target.value })}
                        className="w-24 font-mono text-xs"
                        aria-label={`${nombre} en hex`}
                      />
                    </label>
                  ))}
                </div>
                <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                  {chequeos.map((c) => {
                    const nivel = nivelContraste(c.ratio);
                    return (
                      <li key={c.texto} className="flex items-center gap-2">
                        {nivel === 'bajo' ? (
                          <AlertTriangle className="size-4 text-amber-600" aria-hidden />
                        ) : (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                        )}
                        <span className="flex-1">{c.texto}</span>
                        <span
                          className={cn(
                            'tabular-nums',
                            nivel === 'bajo' && 'font-medium text-amber-700',
                          )}
                        >
                          {c.ratio.toFixed(1)}:1 {nivel === 'bajo' ? '· se lee mal' : `· ${nivel}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Bloque>

              <Bloque titulo="Tipografía">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ['fuenteTitulos', 'Títulos'],
                      ['fuenteTexto', 'Texto'],
                    ] as const
                  ).map(([campo, nombre]) => (
                    <label key={campo} className="space-y-1.5">
                      <span className="text-sm font-medium">{nombre}</span>
                      <select
                        value={m[campo]}
                        onChange={(e) => set({ [campo]: e.target.value as FuenteId })}
                        className="h-10 w-full rounded-md border bg-transparent px-2"
                      >
                        {FUENTES.map((fu) => (
                          <option key={fu} value={fu}>
                            {fu}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </Bloque>

              <Bloque
                titulo="Imágenes"
                descripcion="Se comprimen solas antes de subir. Formatos: JPG, PNG o WebP."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <CampoImagen
                    etiqueta="Logo"
                    valor={m.logoUrl}
                    onCambio={(u) => set({ logoUrl: u })}
                    carpeta="marca"
                    aspecto="aspect-[3/2]"
                  />
                  <CampoImagen
                    etiqueta="Ícono de la pestaña"
                    valor={m.faviconUrl}
                    onCambio={(u) => set({ faviconUrl: u })}
                    carpeta="marca"
                    aspecto="aspect-square"
                    ayuda="Cuadrado, PNG."
                  />
                  <CampoImagen
                    etiqueta="Imagen para compartir"
                    valor={m.ogImageUrl}
                    onCambio={(u) => set({ ogImageUrl: u })}
                    carpeta="marca"
                    aspecto="aspect-[1200/630]"
                    ayuda="La que aparece al mandar el link por WhatsApp. 1200×630."
                  />
                  <CampoImagen
                    etiqueta="Portada en computadora"
                    valor={m.heroDesktopUrl}
                    onCambio={(u) => set({ heroDesktopUrl: u })}
                    carpeta="marca"
                    aspecto="aspect-video"
                    ayuda="Horizontal. Dejá libre el lado izquierdo para el texto."
                  />
                  <CampoImagen
                    etiqueta="Portada en celular"
                    valor={m.heroMovilUrl}
                    onCambio={(u) => set({ heroMovilUrl: u })}
                    carpeta="marca"
                    aspecto="aspect-[9/16]"
                    ayuda="Vertical."
                  />
                </div>
              </Bloque>
            </div>

            {/* Vista previa en vivo */}
            <div className="xl:sticky xl:top-4 xl:self-start">
              <p className="mb-2 text-sm font-medium">Vista previa</p>
              <div
                className="overflow-hidden rounded-2xl border p-4"
                style={
                  {
                    background: m.colorFondo,
                    color: m.colorTexto,
                    fontFamily: fuentes.texto,
                  } as CSSProperties
                }
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.3em] uppercase"
                  style={{ color: m.colorPrimario }}
                >
                  {local.bajada || 'Tu bajada'}
                </p>
                <p className="mt-1 text-3xl" style={{ fontFamily: fuentes.titulos }}>
                  ¿Qué pedimos hoy?
                </p>
                <div
                  className="mt-4 flex gap-3 rounded-2xl p-3"
                  style={{ background: m.colorSuperficie }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Milanesa al plato</p>
                    <p className="text-sm" style={{ color: m.colorTextoSecundario }}>
                      Con papas fritas y ensalada.
                    </p>
                    <p className="mt-2 font-bold" style={{ color: m.colorPrimario }}>
                      $ 12.000
                    </p>
                  </div>
                  <div
                    className="size-16 shrink-0 rounded-xl"
                    style={{
                      background: `color-mix(in oklab, ${m.colorPrimario} 25%, ${m.colorSuperficie})`,
                    }}
                  />
                </div>
                <div
                  className="mt-4 flex h-11 items-center justify-between rounded-full px-5 text-sm font-semibold text-black"
                  style={{ background: m.colorPrimario }}
                >
                  <span>Ver pedido</span>
                  <span>$ 12.000</span>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </FormularioSeccion>
  );
}
