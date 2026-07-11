export interface AppTabConfig {
    name: 'index' | 'plan' | 'nutrition' | 'workout' | 'history' | 'settings';
    title: string;
    icon: string;
}

export const APP_TABS: AppTabConfig[] = [
    { name: 'index', title: 'Dashboard', icon: 'home-outline' },
    { name: 'plan', title: 'Plano', icon: 'calendar-outline' },
    { name: 'nutrition', title: 'Nutrição', icon: 'nutrition-outline' },
    { name: 'workout', title: 'Treinos', icon: 'barbell-outline' },
    { name: 'history', title: 'Histórico', icon: 'time-outline' },
    { name: 'settings', title: 'Perfil', icon: 'settings-outline' },
];
