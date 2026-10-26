import { router } from 'expo-router';

export function navigateToFoodScan(foodItemId?: string) {
    router.push(foodItemId
        ? { pathname: '/food/scan', params: { id: foodItemId } }
        : '/food/scan');
}
