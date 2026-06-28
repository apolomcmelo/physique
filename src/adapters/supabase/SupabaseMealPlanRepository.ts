import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { supabase } from '../../infrastructure/supabase/client';

interface MealPlanEntryRow {
    id: string;
    day: string;
    time: string;
    activity: string;
    description: string;
    biological_objective: string;
    created_at: string;
}

function rowToEntry(row: MealPlanEntryRow): MealPlanEntry {
    return {
        id: row.id,
        day: row.day,
        time: row.time,
        activity: row.activity,
        description: row.description,
        biologicalObjective: row.biological_objective,
    };
}

function entryToRow(entry: MealPlanEntry): Omit<MealPlanEntryRow, 'created_at'> {
    return {
        id: entry.id,
        day: entry.day,
        time: entry.time,
        activity: entry.activity,
        description: entry.description,
        biological_objective: entry.biologicalObjective,
    };
}

export class SupabaseMealPlanRepository implements IMealPlanRepository {
    async getMealPlanEntries(): Promise<MealPlanEntry[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('*')
            .order('time', { ascending: true });

        if (error) {
            throw new Error(`Failed to get meal plan entries: ${error.message}`);
        }

        return (data as MealPlanEntryRow[]).map(rowToEntry);
    }

    async saveMealPlanEntries(entries: MealPlanEntry[]): Promise<void> {
        if (entries.length === 0) {
            return;
        }

        const rows = entries.map((e) => ({
            ...entryToRow(e),
            created_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('meal_plan_entries').insert(rows);

        if (error) {
            throw new Error(`Failed to save meal plan entries: ${error.message}`);
        }
    }

    async clearMealPlan(): Promise<void> {
        const { error } = await supabase
            .from('meal_plan_entries')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

        if (error) {
            throw new Error(`Failed to clear meal plan: ${error.message}`);
        }
    }
}
