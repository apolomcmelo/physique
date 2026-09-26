import { generateId } from '../value-objects/UUID';

export interface CompletedSet {
    id: string;
    exerciseId: string;
    setNumber: number;
    repsCompleted: number;
    weightUsedKg: number | null;
    completedAt: Date;
    durationSeconds?: number | null;
    exerciseName?: string | null;
    prescribedReps?: number | null;
    prescribedWeightKg?: number | null;
    prescribedDurationSeconds?: number | null;
    prescribedSets?: number | null;
    exerciseNotes?: string | null;
    exerciseOrderIndex?: number | null;
    prescribedRestBetweenSets?: number | null;
    prescribedRestBeforeNextExercise?: number | null;
}

export interface WorkoutSession {
    id: string;
    workoutId: string;
    startedAt: Date;
    finishedAt: Date | null;
    status?: 'active' | 'complete' | 'partial';
    sets: CompletedSet[];
    workoutName?: string | null;
    workoutType?: string | null;
    workoutScheduledAt?: Date | null;
}

export type CreateCompletedSetParams = Omit<CompletedSet, 'id'>;
export type CreateWorkoutSessionParams = Omit<WorkoutSession, 'id'>;

export function createCompletedSet(params: CreateCompletedSetParams): CompletedSet {
    if (!params.exerciseId || params.exerciseId.trim().length === 0) {
        throw new Error('Exercise ID is required');
    }
    if (params.setNumber <= 0) {
        throw new Error('Set number must be greater than 0');
    }
    if (params.repsCompleted < 0) {
        throw new Error('Reps completed cannot be negative');
    }
    if (!Number.isInteger(params.repsCompleted)) throw new Error('Reps completed must be an integer');
    if (params.durationSeconds != null && (!Number.isFinite(params.durationSeconds) || params.durationSeconds < 0)) throw new Error('Duration must not be negative');
    return {
        ...params,
        id: generateId(),
    };
}

export function createWorkoutSession(params: CreateWorkoutSessionParams): WorkoutSession {
    if (!params.workoutId || params.workoutId.trim().length === 0) {
        throw new Error('Workout ID is required');
    }
    return {
        ...params,
        id: generateId(),
    };
}
