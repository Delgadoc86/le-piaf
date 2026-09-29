'use client';

import { localEditableSchema, type LocalEditable } from '@app/shared';
import { Input } from '@/components/ui/input';
import { Bloque, Campo } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({ contacto: true });

/** Contacto y redes: lo único del local que el dueño cambia seguido (además de los horarios). */
export function Contacto({ local }: { local: LocalEditable }) {
  return (
    <FormularioSeccion esquema={esquema} inicial={{ contacto: local.contacto }}>
      {(f) => {
        const c = f.valor.contacto;
        const set = (campo: keyof typeof c, valor: string) =>
          f.cambiar('contacto', { ...c, [campo]: valor.trim() || undefined });
        return (
          <Bloque
            titulo="Contacto y redes"
            descripcion="Se muestran en la web y en los botones de WhatsApp."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                etiqueta="WhatsApp"
                error={f.errores['contacto.whatsapp']}
                ayuda="Con código de país y área, sin espacios. Ej.: 5492616367525"
              >
                {(i) => (
                  <Input
                    id={i}
                    inputMode="numeric"
                    value={c.whatsapp}
                    onChange={(e) =>
                      f.cambiar('contacto', { ...c, whatsapp: e.target.value.replace(/\D/g, '') })
                    }
                  />
                )}
              </Campo>
              <Campo etiqueta="Teléfono (opcional)">
                {(i) => (
                  <Input
                    id={i}
                    value={c.telefono ?? ''}
                    onChange={(e) => set('telefono', e.target.value)}
                  />
                )}
              </Campo>
              <Campo etiqueta="Instagram" error={f.errores['contacto.instagram']}>
                {(i) => (
                  <Input
                    id={i}
                    value={c.instagram ?? ''}
                    placeholder="https://instagram.com/tu-local"
                    onChange={(e) => set('instagram', e.target.value)}
                  />
                )}
              </Campo>
              <Campo etiqueta="Facebook" error={f.errores['contacto.facebook']}>
                {(i) => (
                  <Input
                    id={i}
                    value={c.facebook ?? ''}
                    placeholder="https://facebook.com/tu-local"
                    onChange={(e) => set('facebook', e.target.value)}
                  />
                )}
              </Campo>
              <Campo etiqueta="TikTok" error={f.errores['contacto.tiktok']}>
                {(i) => (
                  <Input
                    id={i}
                    value={c.tiktok ?? ''}
                    placeholder="https://tiktok.com/@tu-local"
                    onChange={(e) => set('tiktok', e.target.value)}
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
