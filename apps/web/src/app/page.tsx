import { redirect } from 'next/navigation';

// La raíz será la web pública del local (Fase 1). Mientras tanto, lleva al panel.
export default function Home() {
  redirect('/panel');
}
