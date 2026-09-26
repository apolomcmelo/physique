import { WorkoutSession } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

export async function savePartialWorkoutSession(repo: IWorkoutRepository, session: WorkoutSession): Promise<WorkoutSession> {
    if (session.finishedAt) throw new Error('Session already finished');
    const partial: WorkoutSession = { ...session, finishedAt: new Date(), status: 'partial' };
    await repo.saveWorkoutSession(partial);
    return partial;
}
