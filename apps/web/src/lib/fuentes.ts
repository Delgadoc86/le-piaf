/**
 * Lista curada de fuentes (ROADMAP §11). next/font las autoaloja con fallback ajustado (sin saltos
 * de layout). Sin preload: el navegador descarga solo las que el local usa de verdad (las que
 * aparecen en --fuente-titulos / --fuente-texto).
 */
import {
  Bebas_Neue,
  Inter,
  Montserrat,
  Oswald,
  Playfair_Display,
  Poppins,
  Roboto,
  Sriracha,
} from 'next/font/google';
import type { FuenteId } from '@app/shared';

// next/font analiza estas llamadas al compilar: las opciones tienen que ir literales (sin spread).
const sriracha = Sriracha({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' });
const bebas = Bebas_Neue({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' });
const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  weight: ['400', '600', '700'],
});
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', preload: false });
const oswald = Oswald({ subsets: ['latin'], display: 'swap', preload: false });
const roboto = Roboto({ subsets: ['latin'], display: 'swap', preload: false });
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', preload: false });

const FUENTES: Record<FuenteId, string> = {
  Sriracha: sriracha.style.fontFamily,
  'Bebas Neue': bebas.style.fontFamily,
  Poppins: poppins.style.fontFamily,
  'Playfair Display': playfair.style.fontFamily,
  Oswald: oswald.style.fontFamily,
  Roboto: roboto.style.fontFamily,
  Inter: inter.style.fontFamily,
  Montserrat: montserrat.style.fontFamily,
};

/** Familias CSS (con su fallback ajustado) de las dos fuentes elegidas por el local. */
export function fuentesDelLocal(titulos: FuenteId, texto: FuenteId) {
  return { titulos: FUENTES[titulos], texto: FUENTES[texto] };
}
