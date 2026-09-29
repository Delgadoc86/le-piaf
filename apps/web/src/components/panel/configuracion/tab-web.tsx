'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  localEditableSchema,
  type ContenidoWeb,
  type LocalEditable,
  type SeccionWeb,
} from '@app/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Bloque, Campo, CampoImagen } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({ web: true });

const NOMBRE_SECCION: Record<SeccionWeb, string> = {
  hero: 'Portada',
  promos: 'Promos',
  carta: 'Carta',
  nosotros: 'Historia',
  galeria: 'Galería',
  ubicacion: 'Ubicación y mapa',
};
const ICONOS_TARJETA = [
  ['beer', 'Cerveza'],
  ['utensils', 'Cubiertos'],
  ['heart', 'Corazón'],
  ['calendar', 'Calendario'],
  ['flame', 'Fuego'],
  ['star', 'Estrella'],
] as const;

export function TabWeb({ local }: { local: LocalEditable }) {
  return (
    <FormularioSeccion esquema={esquema} inicial={{ web: local.web }}>
      {(f) => {
        const w = f.valor.web;
        const set = (cambio: Partial<ContenidoWeb>) => f.cambiar('web', { ...w, ...cambio });
        const nos = w.nosotros;
        const setNos = (cambio: Partial<ContenidoWeb['nosotros']>) =>
          set({ nosotros: { ...nos, ...cambio } });
        return (
          <>
            <Bloque
              titulo="Secciones de la web"
              descripcion="Apagá las que no quieras mostrar. La carta siempre se muestra."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {w.secciones.map((s, i) => (
                  <label
                    key={s.tipo}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    {NOMBRE_SECCION[s.tipo]}
                    <Switch
                      checked={s.visible}
                      disabled={s.tipo === 'carta' || s.tipo === 'hero'}
                      onCheckedChange={(c) =>
                        set({
                          secciones: w.secciones.map((x, j) =>
                            j === i ? { ...x, visible: c } : x,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </Bloque>

            <Bloque titulo="Portada">
              <div className="grid gap-4 md:grid-cols-3">
                <Campo etiqueta="Bajada">
                  {(i) => (
                    <Input
                      id={i}
                      value={w.hero.bajada}
                      onChange={(e) => set({ hero: { ...w.hero, bajada: e.target.value } })}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Título">
                  {(i) => (
                    <Input
                      id={i}
                      value={w.hero.titulo}
                      onChange={(e) => set({ hero: { ...w.hero, titulo: e.target.value } })}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Texto del botón">
                  {(i) => (
                    <Input
                      id={i}
                      value={w.hero.textoBoton}
                      onChange={(e) => set({ hero: { ...w.hero, textoBoton: e.target.value } })}
                    />
                  )}
                </Campo>
              </div>
            </Bloque>

            <Bloque
              titulo="Historia"
              descripcion="El primer párrafo se ve siempre; el resto, al tocar “Leer la historia completa”."
            >
              <div className="grid gap-5 md:grid-cols-[1fr_240px]">
                <div className="space-y-4">
                  <Campo etiqueta="Título">
                    {(i) => (
                      <Input
                        id={i}
                        value={nos.titulo}
                        onChange={(e) => setNos({ titulo: e.target.value })}
                      />
                    )}
                  </Campo>
                  <Campo etiqueta="Frase destacada">
                    {(i) => (
                      <Input
                        id={i}
                        value={nos.frase}
                        onChange={(e) => setNos({ frase: e.target.value })}
                      />
                    )}
                  </Campo>
                  {nos.parrafos.map((p, k) => (
                    <div key={k} className="flex gap-2">
                      <Textarea
                        rows={3}
                        aria-label={`Párrafo ${k + 1}`}
                        value={p}
                        onChange={(e) =>
                          setNos({
                            parrafos: nos.parrafos.map((x, j) => (j === k ? e.target.value : x)),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar párrafo"
                        onClick={() => setNos({ parrafos: nos.parrafos.filter((_, j) => j !== k) })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNos({ parrafos: [...nos.parrafos, ''] })}
                  >
                    <Plus className="size-4" /> Párrafo
                  </Button>
                  <Campo etiqueta="Cierre">
                    {(i) => (
                      <Textarea
                        id={i}
                        rows={2}
                        value={nos.cierre}
                        onChange={(e) => setNos({ cierre: e.target.value })}
                      />
                    )}
                  </Campo>
                </div>
                <CampoImagen
                  etiqueta="Foto"
                  valor={nos.fotoUrl}
                  onCambio={(u) => setNos({ fotoUrl: u })}
                  carpeta="web"
                  aspecto="aspect-video"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Destacados (se ven como etiquetas)</p>
                {nos.tarjetas.map((t, k) => (
                  <div key={k} className="flex flex-wrap gap-2">
                    <select
                      aria-label="Ícono"
                      value={t.icono}
                      className="h-9 rounded-md border bg-transparent px-2 text-sm"
                      onChange={(e) =>
                        setNos({
                          tarjetas: nos.tarjetas.map((x, j) =>
                            j === k ? { ...x, icono: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      {ICONOS_TARJETA.map(([c, n]) => (
                        <option key={c} value={c}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="w-48"
                      aria-label="Título"
                      value={t.titulo}
                      onChange={(e) =>
                        setNos({
                          tarjetas: nos.tarjetas.map((x, j) =>
                            j === k ? { ...x, titulo: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      className="min-w-60 flex-1"
                      aria-label="Texto"
                      value={t.texto}
                      onChange={(e) =>
                        setNos({
                          tarjetas: nos.tarjetas.map((x, j) =>
                            j === k ? { ...x, texto: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar"
                      onClick={() => setNos({ tarjetas: nos.tarjetas.filter((_, j) => j !== k) })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNos({
                      tarjetas: [...nos.tarjetas, { icono: 'star', titulo: '', texto: '' }],
                    })
                  }
                >
                  <Plus className="size-4" /> Destacado
                </Button>
              </div>
            </Bloque>

            <Bloque titulo="Galería">
              <div className="grid gap-4 sm:grid-cols-3">
                {w.galeria.map((g, k) => (
                  <div key={k} className="space-y-2 rounded-lg border p-2">
                    <CampoImagen
                      etiqueta={`Foto ${k + 1}`}
                      valor={g.fotoUrl}
                      carpeta="galeria"
                      onCambio={(u) =>
                        set({
                          galeria: w.galeria.map((x, j) => (j === k ? { ...x, fotoUrl: u } : x)),
                        })
                      }
                    />
                    <Input
                      aria-label="Título de la foto"
                      placeholder="Título"
                      value={g.titulo}
                      onChange={(e) =>
                        set({
                          galeria: w.galeria.map((x, j) =>
                            j === k ? { ...x, titulo: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => set({ galeria: w.galeria.filter((_, j) => j !== k) })}
                    >
                      <Trash2 className="size-4" /> Quitar
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set({ galeria: [...w.galeria, { fotoUrl: '', titulo: '' }] })}
              >
                <Plus className="size-4" /> Foto
              </Button>
            </Bloque>

            <Bloque titulo="Nota al pie de la carta">
              <Textarea
                rows={2}
                aria-label="Nota de la carta"
                value={w.notaCarta ?? ''}
                onChange={(e) => set({ notaCarta: e.target.value || undefined })}
              />
            </Bloque>

            <Bloque
              titulo="Google"
              descripcion="Cómo aparece la web en Google y el código de Google Analytics."
            >
              <Campo
                etiqueta="Título para Google"
                ayuda={`${w.seo.titulo.length}/60 caracteres recomendados`}
              >
                {(i) => (
                  <Input
                    id={i}
                    value={w.seo.titulo}
                    onChange={(e) => set({ seo: { ...w.seo, titulo: e.target.value } })}
                  />
                )}
              </Campo>
              <Campo
                etiqueta="Descripción para Google"
                ayuda={`${w.seo.descripcion.length}/155 caracteres recomendados`}
              >
                {(i) => (
                  <Textarea
                    id={i}
                    rows={2}
                    value={w.seo.descripcion}
                    onChange={(e) => set({ seo: { ...w.seo, descripcion: e.target.value } })}
                  />
                )}
              </Campo>
              <Campo etiqueta="Palabras clave (separadas por coma)">
                {(i) => (
                  <Input
                    id={i}
                    defaultValue={w.seo.keywords.join(', ')}
                    onBlur={(e) =>
                      set({
                        seo: {
                          ...w.seo,
                          keywords: e.target.value
                            .split(',')
                            .map((k) => k.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                )}
              </Campo>
              <Campo
                etiqueta="ID de Google Analytics 4"
                error={f.errores['web.ga4Id']}
                ayuda="Empieza con G-. Dejalo vacío si no usás."
              >
                {(i) => (
                  <Input
                    id={i}
                    value={w.ga4Id ?? ''}
                    placeholder="G-XXXXXXXX"
                    onChange={(e) =>
                      set({ ga4Id: e.target.value.trim().toUpperCase() || undefined })
                    }
                  />
                )}
              </Campo>
            </Bloque>
          </>
        );
      }}
    </FormularioSeccion>
  );
}
