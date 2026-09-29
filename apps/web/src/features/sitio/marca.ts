/** Variables CSS de la marca del local (las usan la web pública y la 404). */
import type { Marca } from '@app/shared';
import { fuentesDelLocal } from '@/lib/fuentes';

/** ¿El fondo es oscuro? Define bordes y sombras que acompañan a la marca. */
function esOscuro(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

/**
 * CSS con las variables de la marca en :root (y no en un contenedor) para que las hojas que
 * Radix monta en un portal también las vean.
 */
export function cssMarca(marca: Marca | undefined): string {
  const fuentes = fuentesDelLocal(marca?.fuenteTitulos ?? 'Inter', marca?.fuenteTexto ?? 'Inter');
  const oscuro = esOscuro(marca?.colorFondo ?? '#000000');
  const variables: Record<string, string> = {
    '--marca-primario': marca?.colorPrimario ?? '#f97316',
    '--marca-primario-hover': marca?.colorPrimarioHover ?? '#ea580c',
    '--marca-fondo': marca?.colorFondo ?? '#0a0a0a',
    '--marca-superficie': marca?.colorSuperficie ?? '#171717',
    '--marca-superficie-2': `color-mix(in oklab, ${marca?.colorSuperficie ?? '#171717'} 88%, ${oscuro ? '#fff' : '#000'})`,
    '--marca-texto': marca?.colorTexto ?? '#ffffff',
    '--marca-texto-2': marca?.colorTextoSecundario ?? '#d4d4d4',
    '--marca-borde': oscuro ? 'rgb(255 255 255 / 0.09)' : 'rgb(0 0 0 / 0.1)',
    '--fuente-titulos': fuentes.titulos,
    '--fuente-texto': fuentes.texto,
    'color-scheme': oscuro ? 'dark' : 'light',
  };
  return `:root{${Object.entries(variables)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;
}
