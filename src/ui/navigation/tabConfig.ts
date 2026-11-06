import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';

export type NavIconName = ComponentProps<typeof MaterialIcons>['name'];

export interface AppTabConfig {
    name: 'index' | 'plan' | 'nutrition' | 'workout' | 'history' | 'settings';
    title: string;
    icon: NavIconName;
}

export interface SecondaryNavLink {
    title: string;
    icon: NavIconName;
    href: '/exams' | '/camera';
}

export const WIDE_LAYOUT_MIN_WIDTH = 768;

export function isWideLayout(width: number): boolean {
    return width >= WIDE_LAYOUT_MIN_WIDTH;
}

export const APP_TABS: AppTabConfig[] = [
    { name: 'index', title: 'Dashboard', icon: 'dashboard' },
    { name: 'plan', title: 'Plano', icon: 'calendar-today' },
    { name: 'nutrition', title: 'Nutrição', icon: 'restaurant' },
    { name: 'workout', title: 'Treinos', icon: 'fitness-center' },
    { name: 'history', title: 'Histórico', icon: 'history' },
    { name: 'settings', title: 'Perfil', icon: 'person' },
];

export const SECONDARY_NAV_LINKS: SecondaryNavLink[] = [
    { title: 'Exames', icon: 'monitor-heart', href: '/exams' },
    { title: 'Fotos', icon: 'photo-camera', href: '/camera' },
];
