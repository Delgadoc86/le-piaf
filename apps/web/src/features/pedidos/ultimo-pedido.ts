export const CLAVE_ULTIMO_PEDIDO = 'ultimo-pedido-v1';

export interface UltimoPedidoGuardado {
  token: string;
  numero: number;
}

export function obtenerUltimoPedidoGuardado(): string | null {
  return localStorage.getItem(CLAVE_ULTIMO_PEDIDO);
}

export function suscribirUltimoPedido(cambio: () => void): () => void {
  window.addEventListener('storage', cambio);
  window.addEventListener('ultimo-pedido-cambio', cambio);
  return () => {
    window.removeEventListener('storage', cambio);
    window.removeEventListener('ultimo-pedido-cambio', cambio);
  };
}

export function leerUltimoPedido(contenido: string | null): UltimoPedidoGuardado | null {
  try {
    const guardado: unknown = JSON.parse(contenido ?? 'null');
    if (typeof guardado !== 'object' || guardado === null) return null;

    const pedido = guardado as Record<string, unknown>;
    if (
      typeof pedido.token !== 'string' ||
      pedido.token.length === 0 ||
      typeof pedido.numero !== 'number' ||
      !Number.isSafeInteger(pedido.numero) ||
      pedido.numero < 1
    ) {
      return null;
    }

    return { token: pedido.token, numero: pedido.numero };
  } catch {
    return null;
  }
}

export function guardarUltimoPedido(pedido: UltimoPedidoGuardado): void {
  try {
    localStorage.setItem(CLAVE_ULTIMO_PEDIDO, JSON.stringify(pedido));
    window.dispatchEvent(new Event('ultimo-pedido-cambio'));
  } catch {
    // El pedido sigue confirmado aunque el navegador no permita guardar el acceso.
  }
}

export function ocultarUltimoPedido(): void {
  try {
    localStorage.removeItem(CLAVE_ULTIMO_PEDIDO);
    window.dispatchEvent(new Event('ultimo-pedido-cambio'));
  } catch {
    // El acceso se puede volver a ocultar cuando el navegador permita guardar cambios.
  }
}
