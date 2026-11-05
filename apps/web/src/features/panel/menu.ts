/** Menú lateral del panel de gestión. */
import type { Rol } from '@app/shared';
import {
  BarChart3,
  ClipboardList,
  HelpCircle,
  Home,
  KeyRound,
  Percent,
  QrCode,
  Settings,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type SeccionMenu = 'operaciones' | 'finanzas' | 'catalogo' | 'sistema';

export interface ItemMenu {
  ruta: string; // relativa a /panel
  titulo: string;
  icono: LucideIcon;
  roles: readonly Rol[];
  seccion: SeccionMenu;
}

const GESTORES = ['dueno', 'encargado'] as const;

export const MENU: readonly ItemMenu[] = [
  {
    ruta: '',
    titulo: 'Resumen',
    icono: Home,
    roles: ['dueno', 'encargado', 'mozo', 'cocina'],
    seccion: 'operaciones',
  },
  {
    ruta: 'mostrador',
    titulo: 'Mostrador',
    icono: ShoppingBag,
    roles: [...GESTORES, 'mozo'],
    seccion: 'operaciones',
  },
  {
    ruta: 'pedidos',
    titulo: 'Pedidos',
    icono: ClipboardList,
    roles: [...GESTORES, 'mozo'],
    seccion: 'operaciones',
  },
  {
    ruta: 'caja',
    titulo: 'Caja',
    icono: Wallet,
    roles: GESTORES,
    seccion: 'finanzas',
  },
  {
    ruta: 'ventas',
    titulo: 'Ventas',
    icono: BarChart3,
    roles: GESTORES,
    seccion: 'finanzas',
  },
  {
    ruta: 'carta',
    titulo: 'Carta',
    icono: UtensilsCrossed,
    roles: GESTORES,
    seccion: 'catalogo',
  },
  {
    ruta: 'promos',
    titulo: 'Promos',
    icono: Percent,
    roles: GESTORES,
    seccion: 'catalogo',
  },
  {
    ruta: 'qr',
    titulo: 'QR de la carta',
    icono: QrCode,
    roles: GESTORES,
    seccion: 'catalogo',
  },
  {
    ruta: 'configuracion',
    titulo: 'Configuración',
    icono: Settings,
    roles: ['dueno'],
    seccion: 'sistema',
  },
  {
    ruta: 'cuenta',
    titulo: 'Mi cuenta',
    icono: KeyRound,
    roles: ['dueno', 'encargado', 'mozo', 'cocina'],
    seccion: 'sistema',
  },
  {
    ruta: 'ayuda',
    titulo: 'Ayuda',
    icono: HelpCircle,
    roles: ['dueno', 'encargado', 'mozo', 'cocina'],
    seccion: 'sistema',
  },
];

export const ETIQUETA_SECCION: Record<SeccionMenu, string> = {
  operaciones: 'Operaciones',
  finanzas: 'Finanzas',
  catalogo: 'Catálogo',
  sistema: 'Sistema',
};

export function menuPara(rol: Rol): ItemMenu[] {
  return MENU.filter((i) => i.roles.includes(rol));
}

export const NOMBRE_ROL: Record<Rol, string> = {
  dueno: 'Dueño',
  encargado: 'Encargado',
  mozo: 'Mozo',
  cocina: 'Cocina',
};
