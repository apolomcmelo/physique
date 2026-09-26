import { IWorkoutRepository } from '../../domain/ports/WorkoutRepository';
import { Workout, Exercise, WorkoutType } from '../../domain/entities/Workout';
import { WorkoutSession, CompletedSet } from '../../domain/entities/WorkoutSession';
import { supabase } from '../../infrastructure/supabase/client';
import { requireAuthUserId } from './currentAuthUser';

// ── Row types ────────────────────────────────────────────────────────────────

interface WorkoutRow {
    id: string;
    name: string;
    type: WorkoutType;
    scheduled_at: string | null;
    created_at: string;
    updated_at: string;
    exercises?: ExerciseRow[];
}

interface ExerciseRow {
    id: string;
    workout_id: string;
    name: string;
    order_index?: number | null;
    sets: number | null;
    reps_per_set: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    rest_seconds_between_sets?: number | null;
    rest_seconds_before_next_exercise?: number | null;
    notes: string | null;
    created_at: string;
}

interface WorkoutSessionRow {
    id: string;
    workout_id: string;
    started_at: string;
    finished_at: string | null;
    created_at: string;
    completed_sets?: CompletedSetRow[];
    workout_name?: string | null;
    workout_type?: string | null;
    workout_scheduled_at?: string | null;
    status?: 'active' | 'complete' | 'partial';
}

interface CompletedSetRow {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    reps_completed: number;
    weight_used_kg: number | null;
    completed_at: string;
    exercise_name?: string | null;
    prescribed_reps?: number | null;
    prescribed_weight_kg?: number | null;
    prescribed_duration_seconds?: number | null;
    prescribed_sets?: number | null;
    exercise_notes?: string | null;
    exercise_order_index?: number | null;
    prescribed_rest_between_sets?: number | null;
    prescribed_rest_before_next_exercise?: number | null;
    duration_seconds?: number | null;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function rowToExercise(row: ExerciseRow): Exercise {
    return {
        id: row.id,
        name: row.name,
        orderIndex: row.order_index ?? 0,
        sets: row.sets,
        repsPerSet: row.reps_per_set,
        weightKg: row.weight_kg,
        durationSeconds: row.duration_seconds ?? null,
        restSecondsBetweenSets: row.rest_seconds_between_sets ?? null,
        restSecondsBeforeNextExercise: row.rest_seconds_before_next_exercise ?? null,
        notes: row.notes,
    };
}

function rowToWorkout(row: WorkoutRow): Workout {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        exercises: (row.exercises ?? []).map(rowToExercise).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

function rowToCompletedSet(row: CompletedSetRow): CompletedSet {
    return {
        id: row.id,
        exerciseId: row.exercise_id,
        setNumber: row.set_number,
        repsCompleted: row.reps_completed,
        weightUsedKg: row.weight_used_kg,
        completedAt: new Date(row.completed_at),
        durationSeconds: row.duration_seconds ?? null,
        exerciseName: row.exercise_name ?? null,
        prescribedReps: row.prescribed_reps ?? null,
        prescribedWeightKg: row.prescribed_weight_kg ?? null,
        prescribedDurationSeconds: row.prescribed_duration_seconds ?? null,
        prescribedSets: row.prescribed_sets ?? null,
        exerciseNotes: row.exercise_notes ?? null,
        exerciseOrderIndex: row.exercise_order_index ?? null,
        prescribedRestBetweenSets: row.prescribed_rest_between_sets ?? null,
        prescribedRestBeforeNextExercise: row.prescribed_rest_before_next_exercise ?? null,
    };
}

function rowToWorkoutSession(row: WorkoutSessionRow): WorkoutSession {
    return {
        id: row.id,
        workoutId: row.workout_id,
        startedAt: new Date(row.started_at),
        finishedAt: row.finished_at ? new Date(row.finished_at) : null,
        sets: (row.completed_sets ?? []).map(rowToCompletedSet),
        workoutName: row.workout_name ?? null,
        workoutType: row.workout_type ?? null,
        workoutScheduledAt: row.workout_scheduled_at ? new Date(row.workout_scheduled_at) : null,
        status: row.status ?? (row.finished_at ? 'complete' : 'active'),
    };
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SupabaseWorkoutRepository implements IWorkoutRepository {
    async getWorkouts(): Promise<Workout[]> {
        const { data, error } = await supabase
            .from('workouts')
            .select('*, exercises(*)')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get workouts: ${error.message}`);
        }

        return (data as WorkoutRow[]).map(rowToWorkout);
    }

    async getWorkoutById(id: string): Promise<Workout | null> {
        const { data, error } = await supabase
            .from('workouts')
            .select('*, exercises(*)')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to get workout by id: ${error.message}`);
        }

        return data ? rowToWorkout(data as WorkoutRow) : null;
    }

    async saveWorkout(workout: Workout): Promise<void> {
        const userId = await requireAuthUserId();
        const { error } = await supabase.rpc('create_workout_atomically', {
            p_workout: {
                id: workout.id, name: workout.name, type: workout.type,
                scheduled_at: workout.scheduledAt?.toISOString() ?? null,
                created_at: workout.createdAt.toISOString(),
                updated_at: workout.updatedAt.toISOString(), user_id: userId,
            },
            p_exercises: workout.exercises.map((e, index) => ({
                id: e.id, workout_id: workout.id, name: e.name,
                order_index: e.orderIndex ?? index, sets: e.sets,
                reps_per_set: e.repsPerSet, weight_kg: e.weightKg,
                duration_seconds: e.durationSeconds,
                rest_seconds_between_sets: e.restSecondsBetweenSets ?? null,
                rest_seconds_before_next_exercise: e.restSecondsBeforeNextExercise ?? null,
                notes: e.notes,
            })),
        });
        if (error) throw new Error(`Failed to save workout: ${error.message}`);
    }

    async updateWorkout(workout: Workout): Promise<void> {
        const userId = await requireAuthUserId();
        const { error } = await supabase.rpc('save_workout_atomically', {
            p_workout: {
                id: workout.id, name: workout.name, type: workout.type,
                scheduled_at: workout.scheduledAt?.toISOString() ?? null,
                created_at: workout.createdAt.toISOString(),
                updated_at: new Date().toISOString(), user_id: userId,
            },
            p_exercises: workout.exercises.map((e, index) => ({
                id: e.id, workout_id: workout.id, name: e.name,
                order_index: e.orderIndex ?? index, sets: e.sets,
                reps_per_set: e.repsPerSet, weight_kg: e.weightKg,
                duration_seconds: e.durationSeconds,
                rest_seconds_between_sets: e.restSecondsBetweenSets ?? null,
                rest_seconds_before_next_exercise: e.restSecondsBeforeNextExercise ?? null,
                notes: e.notes,
            })),
        });
        if (error) throw new Error(`Failed to update workout: ${error.message}`);
    }

    async deleteWorkout(id: string): Promise<void> {
        const { error } = await supabase.from('workouts').delete().eq('id', id);

        if (error) {
            throw new Error(`Failed to delete workout: ${error.message}`);
        }
    }

    async saveWorkoutSession(session: WorkoutSession): Promise<void> {
        const userId = await requireAuthUserId();
        const { error } = await supabase.rpc('save_session_atomically', {
            p_session: {
                id: session.id, workout_id: session.workoutId,
                started_at: session.startedAt.toISOString(),
                finished_at: session.finishedAt?.toISOString() ?? null,
                status: session.status ?? (session.finishedAt ? 'complete' : 'active'),
                user_id: userId,
            },
            p_sets: session.sets.map((s) => ({
                id: s.id, session_id: session.id, exercise_id: s.exerciseId,
                set_number: s.setNumber, reps_completed: s.repsCompleted,
                weight_used_kg: s.weightUsedKg, completed_at: s.completedAt.toISOString(),
                duration_seconds: s.durationSeconds ?? null,
            })),
        });
        if (error) throw new Error(`Failed to save workout session: ${error.message}`);
    }

    async getWorkoutSessions(workoutId?: string): Promise<WorkoutSession[]> {
        let query = supabase
            .from('workout_sessions')
            .select('*, completed_sets(*)')
            .order('started_at', { ascending: false });

        if (workoutId !== undefined) {
            query = query.eq('workout_id', workoutId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to get workout sessions: ${error.message}`);
        }

        return (data as WorkoutSessionRow[]).map(rowToWorkoutSession);
    }

    async deleteWorkoutSession(id: string): Promise<void> {
        const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
        if (error) throw new Error(`Failed to discard workout session: ${error.message}`);
    }
}
