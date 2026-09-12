import { Workout } from '../../entities/Workout';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

function sortBySchedule(workouts: Workout[]): Workout[] {
    return workouts
        .filter((workout) => workout.scheduledAt !== null)
        .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime());
}

export async function getNextWorkout(
    repo: IWorkoutRepository,
    now: Date,
): Promise<Workout | null> {
    const workouts = sortBySchedule(await repo.getWorkouts());
    const windowStart = now.getTime() - 60 * 60 * 1000;
    const windowEnd = now.getTime() + 60 * 60 * 1000;

    const active = workouts.filter((workout) => {
        const scheduledTime = workout.scheduledAt!.getTime();
        return scheduledTime >= windowStart && scheduledTime <= windowEnd;
    });

    return active[0] ?? null;
}

/** Returns the next strictly future scheduled workout for dashboard fallback text. */
export async function getNextScheduledWorkout(
    repo: IWorkoutRepository,
    now: Date,
): Promise<Workout | null> {
    const workouts = sortBySchedule(await repo.getWorkouts());
    return workouts.find((workout) => workout.scheduledAt!.getTime() > now.getTime()) ?? null;
}
