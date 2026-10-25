import { MealConsumption, MealConsumptionStatus } from '../../domain/entities/MealConsumption';
import { IMealConsumptionRepository } from '../../domain/ports/MealConsumptionRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { requireAuthUserId } from './currentAuthUser';

interface MealConsumptionRow {
    id: string;
    user_id: string;
    planned_meal_id: string | null;
    activity: string;
    description: string;
    notes: string | null;
    status: MealConsumptionStatus;
    recorded_at: string;
}

function rowToConsumption(row: MealConsumptionRow): MealConsumption {
    return {
        id: row.id,
        userId: row.user_id,
        plannedMealId: row.planned_meal_id,
        activity: row.activity,
        description: row.description,
        notes: row.notes,
        status: row.status,
        recordedAt: new Date(row.recorded_at),
    };
}

function consumptionToRow(consumption: MealConsumption): MealConsumptionRow {
    return {
        id: consumption.id,
        user_id: consumption.userId,
        planned_meal_id: consumption.plannedMealId,
        activity: consumption.activity,
        description: consumption.description,
        notes: consumption.notes,
        status: consumption.status,
        recorded_at: consumption.recordedAt.toISOString(),
    };
}

export class SupabaseMealConsumptionRepository implements IMealConsumptionRepository {
    async getMealConsumptions(): Promise<MealConsumption[]> {
        const { data, error } = await supabase
            .from('meal_consumptions')
            .select('*')
            .order('recorded_at', { ascending: false });
        if (error) throw new Error(`Failed to get meal consumptions: ${error.message}`);
        return (data as MealConsumptionRow[]).map(rowToConsumption);
    }

    async saveMealConsumption(consumption: MealConsumption): Promise<void> {
        const userId = await requireAuthUserId();
        if (consumption.userId !== userId) throw new Error('Meal consumption owner mismatch');
        const { error } = await supabase.from('meal_consumptions').upsert(consumptionToRow(consumption));
        if (error) throw new Error(`Failed to save meal consumption: ${error.message}`);
    }

    async deleteMealConsumption(id: string): Promise<void> {
        const { error } = await supabase.from('meal_consumptions').delete().eq('id', id);
        if (error) throw new Error(`Failed to delete meal consumption: ${error.message}`);
    }
}
