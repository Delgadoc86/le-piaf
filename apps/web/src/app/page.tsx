import { redirect } from 'next/navigation';

// Hasta la Fase 5 no hay landing comercial: la raíz lleva al panel (ROADMAP §9).
export default function Home() {
  redirect('/panel');
}
