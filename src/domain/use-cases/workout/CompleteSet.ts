import { WorkoutSession, createCompletedSet } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';

export async function completeSet(
    repo: IWorkoutRepository,
    session: WorkoutSession,
    exerciseId: string,
    repsCompleted: number,
    weightUsedKg: number | null,
): Promise<WorkoutSession> {
    const setsForExercise = session.sets.filter((s) => s.exerciseId === exerciseId);
    const setNumber = setsForExercise.length + 1;

    const completedSet = createCompletedSet({
        exerciseId,
        setNumber,
        repsCompleted,
        weightUsedKg,
        completedAt: new Date(),
    });

    const updatedSession: WorkoutSession = {
        ...session,
        sets: [...session.sets, completedSet],
    };

    await repo.saveWorkoutSession(updatedSession);
    return updatedSession;
}
