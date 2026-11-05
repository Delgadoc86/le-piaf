'use client';

/**
 * Impresión térmica directa (58 mm / 80 mm) optimizada para cabezales de 203 DPI (1-bit blanco/negro).
 * Construye el nodo #comanda-termica-root como hijo directo de document.body y dispara window.print().
 */
import { formatARS, totalCobrado, vuelto, type Pedido } from '@app/shared';
import { desglosarNotaCocina, ETIQUETA_TIPO, horaDe } from './pedidos';

const CLAVE_AUTO_PRINT = 'panel-auto-print-mostrador-v1';

export function autoImprimirGuardado(): boolean {
  try {
    return localStorage.getItem(CLAVE_AUTO_PRINT) === '1';
  } catch {
    return false;
  }
}

export function guardarAutoImprimir(activo: boolean) {
  try {
    localStorage.setItem(CLAVE_AUTO_PRINT, activo ? '1' : '0');
  } catch {
    // ignorar si localStorage no está disponible
  }
}

export type DatosComandaImprimible = Pick<
  Pedido,
  | 'numero'
  | 'tipo'
  | 'origen'
  | 'cliente'
  | 'entrega'
  | 'items'
  | 'subtotal'
  | 'descuento'
  | 'costoEnvio'
  | 'total'
  | 'pagoElegido'
  | 'pagos'
  | 'estadoPago'
  | 'nota'
> & {
  creadoEn?: { toDate(): Date } | null;
};

const ORIGEN_TEXTO: Record<Pedido['origen'], string> = {
  web: 'WEB',
  mostrador: 'MOSTRADOR',
  telefono: 'TELÉFONO',
  qr_mesa: 'QR MESA',
  mozo: 'SALÓN',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function imprimirComandaTermica(
  pedido: DatosComandaImprimible,
  opciones: { zonaHoraria?: string; nombreLocal?: string } = {},
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const zona = opciones.zonaHoraria ?? 'America/Argentina/Buenos_Aires';
  let root = document.getElementById('comanda-termica-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'comanda-termica-root';
    document.body.appendChild(root);
  }
  root.replaceChildren();

  // 1. Cabecera: Nombre del local y Hora
  const topBar = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #000',
    paddingBottom: '4px',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: '700',
  });
  topBar.appendChild(el('span', {}, (opciones.nombreLocal || 'COMANDA COCINA').toUpperCase()));
  const hora = pedido.creadoEn ? horaDe(pedido.creadoEn, zona) : horaDe({ toDate: () => new Date() }, zona);
  topBar.appendChild(el('span', {}, `${hora} · ${ORIGEN_TEXTO[pedido.origen]}`));
  root.appendChild(topBar);

  // 2. Número de Pedido Gigante + Modalidad de Entrega en bloque invertido 1-bit
  const hero = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  });
  hero.appendChild(
    el(
      'span',
      {
        fontSize: '28px',
        fontWeight: '900',
        letterSpacing: '-0.03em',
        lineHeight: '1',
      },
      `#${pedido.numero}`,
    ),
  );
  hero.appendChild(
    el(
      'span',
      {
        backgroundColor: '#000',
        color: '#fff',
        padding: '3px 7px',
        fontSize: '13px',
        fontWeight: '900',
        textTransform: 'uppercase',
      },
      ETIQUETA_TIPO[pedido.tipo].toUpperCase(),
    ),
  );
  root.appendChild(hero);

  // 3. Cliente y Dirección (si existen)
  if (pedido.cliente?.nombre || pedido.cliente?.telefono || pedido.entrega?.direccion) {
    const boxCliente = el('div', {
      borderTop: '1px dashed #000',
      borderBottom: '2px solid #000',
      padding: '5px 0',
      marginBottom: '8px',
      fontSize: '12px',
    });
    if (pedido.cliente?.nombre || pedido.cliente?.telefono) {
      const lineaCliente = [pedido.cliente?.nombre, pedido.cliente?.telefono]
        .filter(Boolean)
        .join(' · ');
      boxCliente.appendChild(
        el('div', { fontWeight: '800', fontSize: '13px' }, `CLIENTE: ${lineaCliente}`),
      );
    }
    if (pedido.entrega?.direccion) {
      boxCliente.appendChild(
        el(
          'div',
          { fontWeight: '800', marginTop: '2px' },
          `ENTREGAR EN: ${pedido.entrega.direccion}${
            pedido.entrega.referencia ? ` (${pedido.entrega.referencia})` : ''
          }`,
        ),
      );
    }
    root.appendChild(boxCliente);
  }

  // 4. Cuerpo de Ítems de Cocina (Alta legibilidad)
  const lista = el('div', {
    borderBottom: '2px solid #000',
    paddingBottom: '6px',
    marginBottom: '6px',
  });

  for (const item of pedido.items) {
    const fila = el('div', {
      marginBottom: '7px',
      paddingBottom: '5px',
      borderBottom: '1px dotted #000',
    });

    const lineaNombre = el('div', {
      fontSize: '15px',
      fontWeight: '900',
      lineHeight: '1.2',
    });
    const tituloPlato = item.varianteNombre
      ? `${item.cantidad}x ${item.nombre} (${item.varianteNombre})`
      : `${item.cantidad}x ${item.nombre}`;
    lineaNombre.textContent = tituloPlato;
    fila.appendChild(lineaNombre);

    if (item.extras.length > 0) {
      fila.appendChild(
        el(
          'div',
          { fontSize: '12px', fontWeight: '700', paddingLeft: '10px', marginTop: '2px' },
          `+ ${item.extras.map((e) => e.nombre).join(', ')}`,
        ),
      );
    }

    const { exclusiones, aclaracion } = desglosarNotaCocina(item.nota);
    for (const exc of exclusiones) {
      fila.appendChild(
        el(
          'div',
          {
            display: 'inline-block',
            backgroundColor: '#000',
            color: '#fff',
            fontWeight: '900',
            fontSize: '12px',
            padding: '1px 5px',
            marginTop: '3px',
            marginRight: '4px',
          },
          exc,
        ),
      );
    }
    if (aclaracion) {
      fila.appendChild(
        el(
          'div',
          {
            border: '1px solid #000',
            fontWeight: '800',
            fontSize: '12px',
            padding: '2px 5px',
            marginTop: '3px',
          },
          `NOTA: ${aclaracion}`,
        ),
      );
    }

    lista.appendChild(fila);
  }
  root.appendChild(lista);

  // 5. Nota general de comanda
  if (pedido.nota) {
    root.appendChild(
      el(
        'div',
        {
          border: '2px solid #000',
          padding: '4px 6px',
          marginBottom: '8px',
          fontWeight: '900',
          fontSize: '12px',
        },
        `ACLARACIÓN: ${pedido.nota}`,
      ),
    );
  }

  // 6. Pie: Total, Medio de Pago y Vuelto
  const pie = el('div', { fontSize: '12px', fontWeight: '700' });
  if (pedido.costoEnvio > 0) {
    const filaEnvio = el('div', { display: 'flex', justifyContent: 'space-between' });
    filaEnvio.appendChild(el('span', {}, 'ENVÍO:'));
    filaEnvio.appendChild(el('span', {}, formatARS(pedido.costoEnvio)));
    pie.appendChild(filaEnvio);
  }

  const filaTotal = el('div', {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    fontWeight: '900',
    marginTop: '2px',
    marginBottom: '4px',
  });
  filaTotal.appendChild(el('span', {}, 'TOTAL:'));
  filaTotal.appendChild(el('span', {}, formatARS(pedido.total)));
  pie.appendChild(filaTotal);

  const cobrado = totalCobrado(pedido.pagos);
  const falta = Math.max(0, pedido.total - cobrado);
  const estadoTexto =
    pedido.estadoPago === 'pagado'
      ? `PAGADO (${pedido.pagos.map((p) => `${p.medio.toUpperCase()} ${formatARS(p.monto)}`).join(' + ')})`
      : `A COBRAR: ${formatARS(falta)} (${pedido.pagoElegido.medio.toUpperCase()})`;

  pie.appendChild(
    el(
      'div',
      {
        borderTop: '1px dashed #000',
        paddingTop: '4px',
        fontWeight: '900',
        fontSize: '12px',
      },
      estadoTexto,
    ),
  );

  const pagaCon = pedido.pagoElegido.pagaCon;
  const montoVuelto = vuelto(falta > 0 ? falta : pedido.total, pagaCon);
  if (pagaCon && montoVuelto > 0) {
    pie.appendChild(
      el(
        'div',
        { fontWeight: '900', fontSize: '13px', marginTop: '2px' },
        `PAGA CON ${formatARS(pagaCon)} -> VUELTO: ${formatARS(montoVuelto)}`,
      ),
    );
  }

  root.appendChild(pie);

  window.print();
}

