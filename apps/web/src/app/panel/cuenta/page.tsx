import CuentaPage from './cliente';

// Panel privado: se renderiza en el cliente después de validar la sesión.
export const instant = false;

export default function Pagina() {
  return <CuentaPage />;
}
