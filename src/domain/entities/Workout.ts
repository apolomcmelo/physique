import { generateId } from '../value-objects/UUID';

export interface Exercise {
    id: string;
    name: string;
    sets: number | null;
    repsPerSet: number | null;
    weightKg: number | null;
    notes: string | null;
}

export type WorkoutType = 'HIT' | 'Calisthenics' | 'Weightlifting';

export interface Workout {
    id: string;
    name: string;
    type: WorkoutType;
    exercises: Exercise[];
    scheduledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateExerciseParams = Omit<Exercise, 'id'>;
export type CreateWorkoutParams = Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>;

export function createExercise(params: CreateExerciseParams): Exercise {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('Exercise name is required');
    }
    return {
        ...params,
        id: generateId(),
    };
}

export function createWorkout(params: CreateWorkoutParams): Workout {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('Workout name is required');
    }
    if (!['HIT', 'Calisthenics', 'Weightlifting'].includes(params.type)) {
        throw new Error('Workout type must be HIT, Calisthenics, or Weightlifting');
    }

    const now = new Date();
    return {
        ...params,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
    };
}
