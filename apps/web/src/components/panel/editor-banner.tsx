'use client';

/** Banner de fecha especial: dos imágenes (computadora y celular), texto y rango de fechas. */
import { z } from 'zod';
import { bannerSchema, type Banner } from '@app/shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bloque, Campo, CampoImagen } from './ui-panel';
import { FormularioSeccion } from './configuracion/seccion';

const esquema = z.object({ banner: bannerSchema });

const vacio: Banner = { activo: false, imagenPcUrl: '', imagenMovilUrl: '', alt: '' };

export function EditorBanner({ banner }: { banner: Banner | undefined }) {
  return (
    <FormularioSeccion esquema={esquema} inicial={{ banner: banner ?? vacio }}>
      {(f) => {
        const b = f.valor.banner;
        const set = (cambio: Partial<Banner>) => f.cambiar('banner', { ...b, ...cambio });
        return (
          <Bloque
            titulo="Banner de fecha especial"
            descripcion="Aparece debajo de la portada de la web, solo entre las fechas que elijas. Ideal para Día del Padre, partidos, aniversarios…"
          >
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={b.activo} onCheckedChange={(c) => set({ activo: c })} />
              {b.activo ? 'Banner encendido' : 'Banner apagado'}
            </label>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <CampoImagen
                etiqueta="Imagen para computadora"
                valor={b.imagenPcUrl}
                onCambio={(u) => set({ imagenPcUrl: u })}
                carpeta="banner"
                aspecto="aspect-[16/5]"
                ayuda="Horizontal, ideal 1600 × 500."
              />
              <CampoImagen
                etiqueta="Imagen para celular"
                valor={b.imagenMovilUrl}
                onCambio={(u) => set({ imagenMovilUrl: u })}
                carpeta="banner"
                aspecto="aspect-[4/5]"
                ayuda="Vertical, ideal 1080 × 1350."
              />
            </div>
            {f.errores['banner.imagenPcUrl'] && (
              <p className="text-sm text-destructive">{f.errores['banner.imagenPcUrl']}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo
                etiqueta="¿Qué dice el banner?"
                ayuda="Para Google y lectores de pantalla."
                className="sm:col-span-3"
              >
                {(i) => (
                  <Input
                    id={i}
                    value={b.alt}
                    placeholder="Ej.: Día del Padre: 2×1 en lomos"
                    onChange={(e) => set({ alt: e.target.value })}
                  />
                )}
              </Campo>
              <Campo etiqueta="Desde" ayuda="Vacío = desde ya.">
                {(i) => (
                  <Input
                    id={i}
                    type="date"
                    value={b.desde ?? ''}
                    onChange={(e) => set({ desde: e.target.value || undefined })}
                  />
                )}
              </Campo>
              <Campo
                etiqueta="Hasta (inclusive)"
                error={f.errores['banner.hasta']}
                ayuda="Vacío = sin fin."
              >
                {(i) => (
                  <Input
                    id={i}
                    type="date"
                    value={b.hasta ?? ''}
                    onChange={(e) => set({ hasta: e.target.value || undefined })}
                  />
                )}
              </Campo>
            </div>
          </Bloque>
        );
      }}
    </FormularioSeccion>
  );
}
