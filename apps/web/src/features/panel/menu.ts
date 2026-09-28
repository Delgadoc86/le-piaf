/** Menú lateral del panel según el rol (ROADMAP §6). */
import type { Rol } from '@mimenu/shared';
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  CreditCard,
  Home,
  LayoutGrid,
  MapPin,
  Percent,
  Settings,
  UtensilsCrossed,
  Users,
  UserSquare,
  Wallet,
  Armchair,
  type LucideIcon,
} from 'lucide-react';

export interface ItemMenu {
  ruta: string; // relativa a /panel/[localId]
  titulo: string;
  icono: LucideIcon;
  roles: readonly Rol[];
  /** Fase en la que se construye; mientras tanto se muestra deshabilitado. */
  fase: number;
}

const GESTORES = ['dueno', 'encargado'] as const;

export const MENU: readonly ItemMenu[] = [
  { ruta: '', titulo: 'Resumen', icono: Home, roles: ['dueno', 'encargado', 'mozo', 'cocina'], fase: 0 },
  { ruta: 'pedidos', titulo: 'Pedidos', icono: ClipboardList, roles: [...GESTORES, 'mozo'], fase: 2 },
  { ruta: 'cocina', titulo: 'Cocina', icono: ChefHat, roles: [...GESTORES, 'cocina'], fase: 3 },
  { ruta: 'salon', titulo: 'Salón', icono: Armchair, roles: [...GESTORES, 'mozo'], fase: 3 },
  { ruta: 'caja', titulo: 'Caja', icono: Wallet, roles: GESTORES, fase: 4 },
  { ruta: 'carta', titulo: 'Carta', icono: UtensilsCrossed, roles: GESTORES, fase: 1 },
  { ruta: 'promos', titulo: 'Promos', icono: Percent, roles: GESTORES, fase: 1 },
  { ruta: 'mesas', titulo: 'Mesas', icono: LayoutGrid, roles: GESTORES, fase: 3 },
  { ruta: 'zonas', titulo: 'Zonas de delivery', icono: MapPin, roles: GESTORES, fase: 2 },
  { ruta: 'reportes', titulo: 'Reportes', icono: BarChart3, roles: GESTORES, fase: 4 },
  { ruta: 'clientes', titulo: 'Clientes', icono: UserSquare, roles: GESTORES, fase: 2 },
  { ruta: 'configuracion', titulo: 'Configuración', icono: Settings, roles: ['dueno'], fase: 1 },
  { ruta: 'equipo', titulo: 'Equipo', icono: Users, roles: ['dueno'], fase: 0 },
  { ruta: 'suscripcion', titulo: 'Suscripción', icono: CreditCard, roles: ['dueno'], fase: 5 },
];

/** Fase actual del desarrollo: lo de fases posteriores aparece como "Pronto". */
export const FASE_ACTUAL = 0;

/** El superadmin (rol null en el local) ve todo el menú, en modo soporte. */
export function menuPara(rol: Rol | null): ItemMenu[] {
  return MENU.filter((i) => rol === null || i.roles.includes(rol));
}

export const NOMBRE_ROL: Record<Rol, string> = {
  dueno: 'Dueño',
  encargado: 'Encargado',
  mozo: 'Mozo',
  cocina: 'Cocina',
};
