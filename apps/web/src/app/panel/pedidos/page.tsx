import PedidosPage from './cliente';

// Panel privado y en tiempo real: se renderiza en el cliente después de validar la sesión.
export const instant = false;

export default function Pagina() {
  return <PedidosPage />;
}
