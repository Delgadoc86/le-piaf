import { Suspense } from 'react';
import type { Metadata } from 'next';
import { obtenerSitio } from '@/features/sitio/datos';
import { SeguimientoPedido } from '@/components/publico/seguimiento';

export const metadata: Metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
};

/**
 * Seguimiento del pedido en vivo. La página es estática (datos del local cacheados); el estado se
 * lee en el navegador desde seguimiento/{token}, el espejo público que mantiene espejarSeguimiento.
 */
export default async function PaginaPedido() {
  const datos = await obtenerSitio();
  if (!datos) return null;
  const { local } = datos;
  return (
    <Suspense>
      <SeguimientoPedido
        local={{
          nombre: local.nombre,
          logoUrl: local.marca.logoUrl,
          whatsapp: local.contacto.whatsapp,
          alias: local.pagos.transferencia.habilitado ? local.pagos.transferencia.alias : '',
          titular: local.pagos.transferencia.titular,
          direccion: [local.direccion.calle, local.direccion.localidad].filter(Boolean).join(', '),
          mapsUrl: local.direccion.googleMapsUrl,
        }}
      />
    </Suspense>
  );
}
