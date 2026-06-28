import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const permissionsResult = await Notifications.getPermissionsAsync();
    // PermissionResponse.granted is available at runtime; cast needed due to type mismatch
    const isGranted = (permissionsResult as unknown as { granted: boolean }).granted;

    if (!isGranted) {
        const requestResult = await Notifications.requestPermissionsAsync();
        const granted = (requestResult as unknown as { granted: boolean }).granted;
        if (!granted) return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    return true;
}

export async function scheduleMonthlyPhotoReminder(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Physique — Fotos Mensais 📸',
            body: 'Hoje é dia 1! Tire suas 4 fotos de evolução: frente, costas, perfil esquerdo e perfil direito.',
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            day: 1,
            hour: 9,
            minute: 0,
            repeats: true,
        },
    });
}

export async function cancelMonthlyPhotoReminder(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendWorkoutSoonNotification(workoutName: string, minutesUntil: number): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Treino em breve 💪',
            body: `${workoutName} começa em ${minutesUntil} minutos!`,
            sound: true,
        },
        trigger: null,
    });
}
