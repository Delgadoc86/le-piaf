import { ImageResponse } from 'next/og';
import { obtenerSitio } from '@/features/sitio/datos';

export const alt = 'Carta y pedidos online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagen al compartir el link (WhatsApp, Instagram, Facebook): tarjeta generada con la marca del local. */
export default async function ImagenCompartir() {
  const datos = await obtenerSitio();
  const local = datos?.local;

  const primario = local?.marca.colorPrimario ?? '#f97316';
  const fondo = local?.marca.colorFondo ?? '#0a0a0a';
  const texto = local?.marca.colorTexto ?? '#ffffff';
  const texto2 = local?.marca.colorTextoSecundario ?? '#d4d4d4';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: `radial-gradient(900px 500px at 15% 0%, ${primario}55, transparent 70%), ${fondo}`,
        color: texto,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 28,
          letterSpacing: 8,
          color: primario,
          textTransform: 'uppercase',
        }}
      >
        {local?.bajada ?? 'Carta online'}
      </div>
      <div
        style={{ display: 'flex', fontSize: 104, fontWeight: 800, lineHeight: 1, marginTop: 20 }}
      >
        {local?.nombreCorto ?? 'Mi local'}
      </div>
      <div style={{ display: 'flex', fontSize: 38, color: texto2, marginTop: 28, maxWidth: 900 }}>
        {local?.descripcionCorta ?? ''}
      </div>
      <div style={{ display: 'flex', marginTop: 48 }}>
        <div
          style={{
            display: 'flex',
            background: primario,
            color: '#000',
            fontSize: 30,
            fontWeight: 700,
            padding: '16px 36px',
            borderRadius: 999,
          }}
        >
          Mirá la carta y pedí online
        </div>
      </div>
    </div>,
    size,
  );
}
