import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { Workout } from '../../domain/entities/Workout';
import { supabase } from '../../infrastructure/supabase/client';
import { requireAuthUserId } from './currentAuthUser';

export async function savePlanImport(entries: MealPlanEntry[], workouts: Workout[], importId: string): Promise<void> {
    const userId = await requireAuthUserId();
    const { error } = await supabase.rpc('import_plan_atomically', {
        p_import_id: importId,
        p_meals: entries.map((entry) => ({
            id: entry.id, day: entry.day, time: entry.time,
            activity: entry.activity, description: entry.description,
            biological_objective: entry.biologicalObjective,
        })),
        p_workouts: workouts.map((workout) => ({
            id: workout.id, name: workout.name, type: workout.type,
            scheduled_at: workout.scheduledAt?.toISOString() ?? null,
            created_at: workout.createdAt.toISOString(), updated_at: workout.updatedAt.toISOString(),
            exercises: workout.exercises.map((exercise, index) => ({
                id: exercise.id, name: exercise.name,
                order_index: exercise.orderIndex ?? index,
                sets: exercise.sets, reps_per_set: exercise.repsPerSet,
                weight_kg: exercise.weightKg, duration_seconds: exercise.durationSeconds,
                rest_seconds_between_sets: exercise.restSecondsBetweenSets ?? null,
                rest_seconds_before_next_exercise: exercise.restSecondsBeforeNextExercise ?? null,
                notes: exercise.notes,
            })),
        })),
        p_owner_id: userId,
    });
    if (error) throw new Error(error.message);
}
