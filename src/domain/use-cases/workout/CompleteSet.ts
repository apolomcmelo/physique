import { WorkoutSession, createCompletedSet } from '../../entities/WorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';
import { Exercise } from '../../entities/Workout';

export async function completeSet(
    repo: IWorkoutRepository,
    session: WorkoutSession,
    exercise: Exercise,
    setNumber: number,
    actual: { repsCompleted: number; weightUsedKg: number | null; durationSeconds: number | null },
): Promise<WorkoutSession> {
    if (session.sets.some((set) => set.exerciseId === exercise.id && set.setNumber === setNumber)) throw new Error('Set already recorded');
    if (session.finishedAt || session.status === 'partial') throw new Error('Session already finished');
    if (setNumber !== session.sets.filter((set) => set.exerciseId === exercise.id).length + 1 || setNumber > (exercise.sets ?? 1)) throw new Error('Set out of order');
    if (exercise.durationSeconds !== null && (actual.durationSeconds === null || !Number.isFinite(actual.durationSeconds) || actual.durationSeconds < 0)) throw new Error('Actual duration is required');
    if (exercise.durationSeconds !== null && (actual.repsCompleted !== 0 || actual.weightUsedKg !== null)) throw new Error('Timed set cannot record repetitions or load');
    if (exercise.durationSeconds === null && actual.durationSeconds !== null) throw new Error('Repetition set cannot record timed duration');
    if (actual.weightUsedKg !== null && (!Number.isFinite(actual.weightUsedKg) || actual.weightUsedKg < 0)) throw new Error('Weight must not be negative');

    const completedSet = createCompletedSet({
        exerciseId: exercise.id,
        setNumber,
        repsCompleted: actual.repsCompleted,
        weightUsedKg: actual.weightUsedKg,
        durationSeconds: actual.durationSeconds,
        completedAt: new Date(),
        exerciseName: exercise.name,
        prescribedReps: exercise.repsPerSet,
        prescribedWeightKg: exercise.weightKg,
        prescribedDurationSeconds: exercise.durationSeconds,
        prescribedSets: exercise.sets,
        exerciseNotes: exercise.notes,
        exerciseOrderIndex: exercise.orderIndex ?? 0,
        prescribedRestBetweenSets: exercise.restSecondsBetweenSets ?? null,
        prescribedRestBeforeNextExercise: exercise.restSecondsBeforeNextExercise ?? null,
    });

    const updatedSession: WorkoutSession = {
        ...session,
        sets: [...session.sets, completedSet],
    };

    await repo.saveWorkoutSession(updatedSession);
    return updatedSession;
}
