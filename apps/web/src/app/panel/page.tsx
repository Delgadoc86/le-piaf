import ResumenPage from './resumen';

// Panel privado: se renderiza en el cliente después de validar la sesión (sin validación de navegación instantánea).
export const instant = false;

export default function Pagina() {
  return <ResumenPage />;
}
