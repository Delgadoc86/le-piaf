/** Contraste de colores (WCAG 2.x) para avisar en el panel si la marca se lee mal. */

function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color #rrggbb. */
export function luminancia(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Relación de contraste entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** Nivel WCAG para texto normal: AA pide 4,5; AAA pide 7. */
export function nivelContraste(ratio: number): 'AAA' | 'AA' | 'bajo' {
  return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'bajo';
}
