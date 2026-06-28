import { IWorkoutRepository } from '../../domain/ports/WorkoutRepository';
import { Workout, Exercise, WorkoutType } from '../../domain/entities/Workout';
import { WorkoutSession, CompletedSet } from '../../domain/entities/WorkoutSession';
import { supabase } from '../../infrastructure/supabase/client';

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
    sets: number | null;
    reps_per_set: number | null;
    weight_kg: number | null;
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
}

interface CompletedSetRow {
    id: string;
    session_id: string;
    exercise_id: string;
    set_number: number;
    reps_completed: number;
    weight_used_kg: number | null;
    completed_at: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function rowToExercise(row: ExerciseRow): Exercise {
    return {
        id: row.id,
        name: row.name,
        sets: row.sets,
        repsPerSet: row.reps_per_set,
        weightKg: row.weight_kg,
        notes: row.notes,
    };
}

function rowToWorkout(row: WorkoutRow): Workout {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        exercises: (row.exercises ?? []).map(rowToExercise),
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
    };
}

function rowToWorkoutSession(row: WorkoutSessionRow): WorkoutSession {
    return {
        id: row.id,
        workoutId: row.workout_id,
        startedAt: new Date(row.started_at),
        finishedAt: row.finished_at ? new Date(row.finished_at) : null,
        sets: (row.completed_sets ?? []).map(rowToCompletedSet),
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
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get workout by id: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return rowToWorkout(data as WorkoutRow);
    }

    async saveWorkout(workout: Workout): Promise<void> {
        const { error: workoutError } = await supabase.from('workouts').insert({
            id: workout.id,
            name: workout.name,
            type: workout.type,
            scheduled_at: workout.scheduledAt?.toISOString() ?? null,
            created_at: workout.createdAt.toISOString(),
            updated_at: workout.updatedAt.toISOString(),
        });

        if (workoutError) {
            throw new Error(`Failed to save workout: ${workoutError.message}`);
        }

        if (workout.exercises.length > 0) {
            const exerciseRows = workout.exercises.map((e) => ({
                id: e.id,
                workout_id: workout.id,
                name: e.name,
                sets: e.sets,
                reps_per_set: e.repsPerSet,
                weight_kg: e.weightKg,
                notes: e.notes,
                created_at: new Date().toISOString(),
            }));

            const { error: exercisesError } = await supabase.from('exercises').insert(exerciseRows);

            if (exercisesError) {
                throw new Error(`Failed to save exercises: ${exercisesError.message}`);
            }
        }
    }

    async updateWorkout(workout: Workout): Promise<void> {
        const { error: workoutError } = await supabase
            .from('workouts')
            .upsert({
                id: workout.id,
                name: workout.name,
                type: workout.type,
                scheduled_at: workout.scheduledAt?.toISOString() ?? null,
                created_at: workout.createdAt.toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (workoutError) {
            throw new Error(`Failed to update workout: ${workoutError.message}`);
        }

        // Delete existing exercises and re-insert to keep in sync
        const { error: deleteError } = await supabase
            .from('exercises')
            .delete()
            .eq('workout_id', workout.id);

        if (deleteError) {
            throw new Error(`Failed to update exercises (delete step): ${deleteError.message}`);
        }

        if (workout.exercises.length > 0) {
            const exerciseRows = workout.exercises.map((e) => ({
                id: e.id,
                workout_id: workout.id,
                name: e.name,
                sets: e.sets,
                reps_per_set: e.repsPerSet,
                weight_kg: e.weightKg,
                notes: e.notes,
                created_at: new Date().toISOString(),
            }));

            const { error: insertError } = await supabase.from('exercises').insert(exerciseRows);

            if (insertError) {
                throw new Error(`Failed to update exercises (insert step): ${insertError.message}`);
            }
        }
    }

    async deleteWorkout(id: string): Promise<void> {
        const { error } = await supabase.from('workouts').delete().eq('id', id);

        if (error) {
            throw new Error(`Failed to delete workout: ${error.message}`);
        }
    }

    async saveWorkoutSession(session: WorkoutSession): Promise<void> {
        const { error: sessionError } = await supabase.from('workout_sessions').insert({
            id: session.id,
            workout_id: session.workoutId,
            started_at: session.startedAt.toISOString(),
            finished_at: session.finishedAt?.toISOString() ?? null,
            created_at: new Date().toISOString(),
        });

        if (sessionError) {
            throw new Error(`Failed to save workout session: ${sessionError.message}`);
        }

        if (session.sets.length > 0) {
            const setRows = session.sets.map((s) => ({
                id: s.id,
                session_id: session.id,
                exercise_id: s.exerciseId,
                set_number: s.setNumber,
                reps_completed: s.repsCompleted,
                weight_used_kg: s.weightUsedKg,
                completed_at: s.completedAt.toISOString(),
            }));

            const { error: setsError } = await supabase.from('completed_sets').insert(setRows);

            if (setsError) {
                throw new Error(`Failed to save completed sets: ${setsError.message}`);
            }
        }
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
}
