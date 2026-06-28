import { Workout } from '../../entities/Workout';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

export async function getNextWorkout(
    repo: IWorkoutRepository,
    now: Date,
): Promise<Workout | null> {
    const workouts = await repo.getWorkouts();

    const upcoming = workouts
        .filter((w) => w.scheduledAt !== null && w.scheduledAt > now)
        .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());

    return upcoming[0] ?? null;
}
