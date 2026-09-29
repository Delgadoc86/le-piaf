/** Link de WhatsApp con mensaje armado. `numero`: solo dígitos con código de país (5492616367525). */
export function linkWhatsApp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, '')}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
