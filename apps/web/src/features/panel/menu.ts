/** Menú lateral del panel según el rol (ROADMAP §6). */
import type { Rol } from '@app/shared';
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  Home,
  LayoutGrid,
  MapPin,
  Percent,
  QrCode,
  Settings,
  UtensilsCrossed,
  UserSquare,
  Wallet,
  Armchair,
  type LucideIcon,
} from 'lucide-react';

export interface ItemMenu {
  ruta: string; // relativa a /panel
  titulo: string;
  icono: LucideIcon;
  roles: readonly Rol[];
  /** Fase en la que se construye; mientras tanto se muestra deshabilitado. */
  fase: number;
}

const GESTORES = ['dueno', 'encargado'] as const;

export const MENU: readonly ItemMenu[] = [
  {
    ruta: '',
    titulo: 'Resumen',
    icono: Home,
    roles: ['dueno', 'encargado', 'mozo', 'cocina'],
    fase: 0,
  },
  {
    ruta: 'pedidos',
    titulo: 'Pedidos',
    icono: ClipboardList,
    roles: [...GESTORES, 'mozo'],
    fase: 2,
  },
  { ruta: 'cocina', titulo: 'Cocina', icono: ChefHat, roles: [...GESTORES, 'cocina'], fase: 3 },
  { ruta: 'salon', titulo: 'Salón', icono: Armchair, roles: [...GESTORES, 'mozo'], fase: 3 },
  { ruta: 'caja', titulo: 'Caja', icono: Wallet, roles: GESTORES, fase: 4 },
  { ruta: 'carta', titulo: 'Carta', icono: UtensilsCrossed, roles: GESTORES, fase: 1 },
  { ruta: 'promos', titulo: 'Promos', icono: Percent, roles: GESTORES, fase: 1 },
  { ruta: 'qr', titulo: 'QR de la carta', icono: QrCode, roles: GESTORES, fase: 1 },
  { ruta: 'mesas', titulo: 'Mesas', icono: LayoutGrid, roles: GESTORES, fase: 3 },
  { ruta: 'zonas', titulo: 'Zonas de delivery', icono: MapPin, roles: GESTORES, fase: 2 },
  { ruta: 'reportes', titulo: 'Reportes', icono: BarChart3, roles: GESTORES, fase: 4 },
  { ruta: 'clientes', titulo: 'Clientes', icono: UserSquare, roles: GESTORES, fase: 2 },
  { ruta: 'configuracion', titulo: 'Configuración', icono: Settings, roles: ['dueno'], fase: 1 },
];

/** Fase actual del desarrollo: lo de fases posteriores aparece como "Pronto". */
export const FASE_ACTUAL = 1;

export function menuPara(rol: Rol): ItemMenu[] {
  return MENU.filter((i) => i.roles.includes(rol));
}

export const NOMBRE_ROL: Record<Rol, string> = {
  dueno: 'Dueño',
  encargado: 'Encargado',
  mozo: 'Mozo',
  cocina: 'Cocina',
};
