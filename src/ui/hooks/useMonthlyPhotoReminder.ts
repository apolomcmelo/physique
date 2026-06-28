import { useEffect } from 'react';
import { useRepositories } from './useSupabase';
import { shouldTakeMonthlyPhotos } from '../../domain/use-cases/photo/ShouldTakeMonthlyPhotos';
import {
    scheduleMonthlyPhotoReminder,
    cancelMonthlyPhotoReminder,
} from '../../infrastructure/notifications/NotificationService';

export function useMonthlyPhotoReminder(): void {
    const { photoRepo } = useRepositories();

    useEffect(() => {
        async function check() {
            try {
                const photos = await photoRepo.getBodyPhotos();
                const now = new Date();
                const needed = shouldTakeMonthlyPhotos(photos, now);
                if (needed) {
                    await scheduleMonthlyPhotoReminder();
                } else {
                    await cancelMonthlyPhotoReminder();
                }
            } catch {
                // Silently ignore
            }
        }
        check();
    }, [photoRepo]);
}
