'use client';

import { localEditableSchema, type LocalEditable } from '@app/shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Bloque, Campo } from '../ui-panel';
import { FormularioSeccion } from './seccion';

const esquema = localEditableSchema.pick({
  nombre: true,
  nombreCorto: true,
  bajada: true,
  descripcionCorta: true,
  activo: true,
  contacto: true,
  direccion: true,
});

export function TabLocal({ local }: { local: LocalEditable }) {
  const inicial = {
    nombre: local.nombre,
    nombreCorto: local.nombreCorto,
    bajada: local.bajada,
    descripcionCorta: local.descripcionCorta,
    activo: local.activo,
    contacto: local.contacto,
    direccion: local.direccion,
  };
  return (
    <FormularioSeccion esquema={esquema} inicial={inicial}>
      {(f) => {
        const v = f.valor;
        const contacto = (campo: keyof typeof v.contacto, valor: string) =>
          f.cambiar('contacto', {
            ...v.contacto,
            [campo]: valor || undefined,
            ...(campo === 'whatsapp' ? { whatsapp: valor.replace(/\D/g, '') } : {}),
          });
        const dir = (campo: keyof typeof v.direccion, valor: unknown) =>
          f.cambiar('direccion', { ...v.direccion, [campo]: valor });
        return (
          <>
            <Bloque
              titulo="Web publicada"
              descripcion="Si la apagás, la web muestra “Volvemos pronto”."
            >
              <label className="flex items-center gap-3">
                <Switch checked={v.activo} onCheckedChange={(c) => f.cambiar('activo', c)} />
                {v.activo ? 'La web está visible' : 'La web muestra “Volvemos pronto”'}
              </label>
            </Bloque>

            <Bloque titulo="Datos del local">
              <div className="grid gap-4 md:grid-cols-2">
                <Campo etiqueta="Nombre completo" error={f.errores.nombre}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.nombre}
                      onChange={(e) => f.cambiar('nombre', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo
                  etiqueta="Nombre corto"
                  error={f.errores.nombreCorto}
                  ayuda="Se usa en mensajes: “¡Hola Silverio!”"
                >
                  {(i) => (
                    <Input
                      id={i}
                      value={v.nombreCorto}
                      onChange={(e) => f.cambiar('nombreCorto', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Bajada" ayuda="Ej.: FOOD TRUCK & BEER">
                  {(i) => (
                    <Input
                      id={i}
                      value={v.bajada ?? ''}
                      onChange={(e) => f.cambiar('bajada', e.target.value || undefined)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Descripción corta" error={f.errores.descripcionCorta}>
                  {(i) => (
                    <Textarea
                      id={i}
                      rows={2}
                      value={v.descripcionCorta}
                      onChange={(e) => f.cambiar('descripcionCorta', e.target.value)}
                    />
                  )}
                </Campo>
              </div>
            </Bloque>

            <Bloque titulo="Contacto y redes">
              <div className="grid gap-4 md:grid-cols-2">
                <Campo
                  etiqueta="WhatsApp (con código de país)"
                  error={f.errores['contacto.whatsapp']}
                  ayuda="Ej.: 5492616367525. Ahí llegan los pedidos."
                >
                  {(i) => (
                    <Input
                      id={i}
                      inputMode="numeric"
                      value={v.contacto.whatsapp}
                      onChange={(e) => contacto('whatsapp', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Teléfono (opcional)">
                  {(i) => (
                    <Input
                      id={i}
                      value={v.contacto.telefono ?? ''}
                      onChange={(e) => contacto('telefono', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Email (opcional)" error={f.errores['contacto.email']}>
                  {(i) => (
                    <Input
                      id={i}
                      type="email"
                      value={v.contacto.email ?? ''}
                      onChange={(e) => contacto('email', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Instagram (link)" error={f.errores['contacto.instagram']}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.contacto.instagram ?? ''}
                      placeholder="https://instagram.com/…"
                      onChange={(e) => contacto('instagram', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Facebook (link)" error={f.errores['contacto.facebook']}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.contacto.facebook ?? ''}
                      onChange={(e) => contacto('facebook', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="TikTok (link)" error={f.errores['contacto.tiktok']}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.contacto.tiktok ?? ''}
                      onChange={(e) => contacto('tiktok', e.target.value)}
                    />
                  )}
                </Campo>
              </div>
            </Bloque>

            <Bloque titulo="Dirección" descripcion="Se muestra en la web y en el mapa.">
              <div className="grid gap-4 md:grid-cols-3">
                <Campo
                  etiqueta="Calle y número"
                  error={f.errores['direccion.calle']}
                  className="md:col-span-2"
                >
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.calle}
                      onChange={(e) => dir('calle', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Código postal">
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.cp}
                      onChange={(e) => dir('cp', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Localidad" error={f.errores['direccion.localidad']}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.localidad}
                      onChange={(e) => dir('localidad', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Departamento">
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.departamento}
                      onChange={(e) => dir('departamento', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Provincia" error={f.errores['direccion.provincia']}>
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.provincia}
                      onChange={(e) => dir('provincia', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo
                  etiqueta="Link de Google Maps"
                  error={f.errores['direccion.googleMapsUrl']}
                  className="md:col-span-3"
                  ayuda="En Google Maps: Compartir → Copiar vínculo."
                >
                  {(i) => (
                    <Input
                      id={i}
                      value={v.direccion.googleMapsUrl}
                      onChange={(e) => dir('googleMapsUrl', e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Latitud" error={f.errores['direccion.geo.lat']}>
                  {(i) => (
                    <Input
                      id={i}
                      inputMode="decimal"
                      value={v.direccion.geo.lat}
                      onChange={(e) =>
                        dir('geo', { ...v.direccion.geo, lat: Number(e.target.value) })
                      }
                    />
                  )}
                </Campo>
                <Campo
                  etiqueta="Longitud"
                  error={f.errores['direccion.geo.lng']}
                  ayuda="En Google Maps: clic derecho sobre el local → copiar coordenadas."
                >
                  {(i) => (
                    <Input
                      id={i}
                      inputMode="decimal"
                      value={v.direccion.geo.lng}
                      onChange={(e) =>
                        dir('geo', { ...v.direccion.geo, lng: Number(e.target.value) })
                      }
                    />
                  )}
                </Campo>
              </div>
            </Bloque>
          </>
        );
      }}
    </FormularioSeccion>
  );
}
