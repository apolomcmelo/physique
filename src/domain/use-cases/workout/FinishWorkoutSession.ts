import { WorkoutSession } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';
import { Workout } from '../../entities/Workout';

export async function finishWorkoutSession(
    repo: IWorkoutRepository,
    session: WorkoutSession,
    workout: Workout,
): Promise<WorkoutSession> {
    if (session.finishedAt) throw new Error('Session already finished');
    if (!workout.exercises.length || workout.exercises.some((exercise) => session.sets.filter((set) => set.exerciseId === exercise.id).length !== (exercise.sets ?? 1))) {
        throw new Error('All sets must be recorded before finishing');
    }
    const finishedSession: WorkoutSession = {
        ...session,
        finishedAt: new Date(),
        status: 'complete',
    };

    await repo.saveWorkoutSession(finishedSession);
    return finishedSession;
}
