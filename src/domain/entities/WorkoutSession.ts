import { generateId } from '../value-objects/UUID';

export interface CompletedSet {
    id: string;
    exerciseId: string;
    setNumber: number;
    repsCompleted: number;
    weightUsedKg: number | null;
    completedAt: Date;
}

export interface WorkoutSession {
    id: string;
    workoutId: string;
    startedAt: Date;
    finishedAt: Date | null;
    sets: CompletedSet[];
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
