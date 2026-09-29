/**
 * Mensaje de WhatsApp con el pedido armado en el carrito (paso intermedio hasta que la Fase 2
 * cree el pedido real con crearPedido). Los importes salen de calcularPedido, igual que en el servidor.
 */
import type { TipoPedido } from './constantes.js';
import { formatARS } from './dinero.js';
import type { TotalesPedido } from './precios.js';

export type MedioPagoWeb = 'efectivo' | 'transferencia' | 'mercadopago';

export interface DatosPedidoWhatsApp {
  nombre: string;
  tipo: TipoPedido;
  direccion?: string | undefined;
  referencia?: string | undefined;
  pago: MedioPagoWeb;
  pagaCon?: number | undefined;
  nota?: string | undefined;
}

const TIPO: Record<TipoPedido, string> = {
  take_away: '🏪 Retiro en el local',
  delivery: '🛵 Delivery',
  salon: '🍽️ Para comer en el local',
};

const PAGO: Record<MedioPagoWeb, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
};

export function mensajePedidoWhatsApp(
  nombreLocal: string,
  totales: TotalesPedido,
  datos: DatosPedidoWhatsApp,
): string {
  const lineas: string[] = [`¡Hola ${nombreLocal}! Quiero hacer este pedido:`, ''];

  for (const item of totales.items) {
    const variante = item.varianteNombre ? ` (${item.varianteNombre})` : '';
    const prefijo = item.tipo === 'promo' ? 'Promo ' : '';
    lineas.push(
      `• ${item.cantidad}× ${prefijo}${item.nombre}${variante} — ${formatARS(item.subtotal)}`,
    );
    for (const extra of item.extras) lineas.push(`   + ${extra.nombre}`);
    if (item.nota) lineas.push(`   Nota: ${item.nota}`);
  }

  lineas.push('');
  if (totales.costoEnvio > 0) lineas.push(`Envío: ${formatARS(totales.costoEnvio)}`);
  lineas.push(`*Total: ${formatARS(totales.total)}*`, '');

  const entrega =
    datos.tipo === 'delivery' && datos.direccion
      ? `${TIPO.delivery}: ${datos.direccion}${datos.referencia ? ` (${datos.referencia})` : ''}`
      : TIPO[datos.tipo];
  lineas.push(entrega);

  const pagaCon =
    datos.pago === 'efectivo' && datos.pagaCon && datos.pagaCon > totales.total
      ? ` (pago con ${formatARS(datos.pagaCon)})`
      : '';
  lineas.push(`💵 Pago: ${PAGO[datos.pago]}${pagaCon}`);
  lineas.push(`👤 ${datos.nombre.trim()}`);
  if (datos.nota?.trim()) lineas.push(`📝 ${datos.nota.trim()}`);

  return lineas.join('\n');
}
