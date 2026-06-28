import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRepositories } from './useSupabase';
import { getNextWorkout } from '../../domain/use-cases/workout/GetNextWorkout';
import { isWorkoutSoonIn15Min } from '../../domain/use-cases/workout/IsWorkoutSoonIn15Min';
import { sendWorkoutSoonNotification } from '../../infrastructure/notifications/NotificationService';

export function useWorkoutNotification(): void {
    const { workoutRepo } = useRepositories();
    const checkedRef = useRef(false);

    useEffect(() => {
        async function check() {
            if (checkedRef.current) return;
            try {
                const now = new Date();
                const next = await getNextWorkout(workoutRepo, now);
                if (isWorkoutSoonIn15Min(next, now) && next) {
                    const minutesUntil = next.scheduledAt
                        ? Math.round((next.scheduledAt.getTime() - now.getTime()) / 60000)
                        : 0;
                    await sendWorkoutSoonNotification(next.name, minutesUntil);
                    checkedRef.current = true;
                }
            } catch {
                // Silently ignore notification errors
            }
        }

        check();

        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                checkedRef.current = false;
                check();
            }
        });

        return () => subscription.remove();
    }, [workoutRepo]);
}
