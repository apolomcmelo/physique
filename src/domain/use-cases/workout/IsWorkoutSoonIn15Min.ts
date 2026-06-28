import { Workout } from '../../entities/Workout';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function isWorkoutSoonIn15Min(workout: Workout | null, now: Date): boolean {
    if (!workout || !workout.scheduledAt) {
        return false;
    }
    const diff = workout.scheduledAt.getTime() - now.getTime();
    return diff >= 0 && diff <= FIFTEEN_MINUTES_MS;
}
