'use client';

/**
 * Las hojas (producto y carrito) se cargan recién cuando hacen falta: su JS (Radix Dialog + formularios)
 * no compite con la primera carga de la página.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTiendaUI } from '@/features/carrito/store';

const HojaProducto = dynamic(() => import('./hoja-producto').then((m) => m.HojaProducto), { ssr: false });
const HojaCarrito = dynamic(() => import('./hoja-carrito').then((m) => m.HojaCarrito), { ssr: false });

export function Hojas() {
  const producto = useTiendaUI((e) => e.producto);
  const carrito = useTiendaUI((e) => e.carritoAbierto);
  // Una vez cargada, cada hoja queda montada para que Radix pueda animar el cierre.
  const [usadas, setUsadas] = useState({ producto: false, carrito: false });
  if ((producto !== null && !usadas.producto) || (carrito && !usadas.carrito)) {
    setUsadas({ producto: usadas.producto || producto !== null, carrito: usadas.carrito || carrito });
  }
  return (
    <>
      {usadas.producto && <HojaProducto />}
      {usadas.carrito && <HojaCarrito />}
    </>
  );
}
