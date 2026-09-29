/** Link de WhatsApp con mensaje armado. `numero`: solo dígitos con código de país (5492616367525). */
export function linkWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, '')}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * Teléfono argentino como lo escribe la gente ("261 555-1234", "0261 15 555 1234", "+54 9 261…")
 * → formato de WhatsApp con código de país (5492615551234). Devuelve null si no parece válido.
 */
export function normalizarTelefonoAR(texto: string): string | null {
  let d = texto.replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  // Sacar el "15" de celulares escritos a la antigua: 261 15 5551234 → 261 5551234.
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === '15') {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : null;
}
