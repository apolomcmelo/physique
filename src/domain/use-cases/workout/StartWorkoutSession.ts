import { WorkoutSession, createWorkoutSession } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

export async function startWorkoutSession(
    repo: IWorkoutRepository,
    workoutId: string,
): Promise<WorkoutSession> {
    const session = createWorkoutSession({
        workoutId,
        startedAt: new Date(),
        finishedAt: null,
        sets: [],
    });

    await repo.saveWorkoutSession(session);
    return session;
}
