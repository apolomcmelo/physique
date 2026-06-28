import { WorkoutSession } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

export async function finishWorkoutSession(
    repo: IWorkoutRepository,
    session: WorkoutSession,
): Promise<WorkoutSession> {
    const finishedSession: WorkoutSession = {
        ...session,
        finishedAt: new Date(),
    };

    await repo.saveWorkoutSession(finishedSession);
    return finishedSession;
}
