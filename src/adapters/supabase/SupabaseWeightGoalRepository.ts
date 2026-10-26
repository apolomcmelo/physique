import { WeightGoal } from '../../domain/entities/WeightGoal';
import { IWeightGoalRepository } from '../../domain/ports/WeightGoalRepository';
import { supabase } from '../../infrastructure/supabase/client';

interface WeightGoalRow {
    id: string;
    user_id: string;
    target_weight_kg: number;
    started_at: string;
    created_at: string;
}

function rowToGoal(row: WeightGoalRow): WeightGoal {
    return {
        id: row.id,
        userId: row.user_id,
        targetWeightKg: row.target_weight_kg,
        startedAt: new Date(row.started_at),
        createdAt: new Date(row.created_at),
    };
}

export class SupabaseWeightGoalRepository implements IWeightGoalRepository {
    async getWeightGoals(): Promise<WeightGoal[]> {
        const { data, error } = await supabase
            .from('weight_goals')
            .select('*')
            .order('started_at', { ascending: true });
        if (error) throw new Error(`Failed to get weight goals: ${error.message}`);
        return (data as WeightGoalRow[]).map(rowToGoal);
    }

    async saveWeightGoal(goal: WeightGoal): Promise<void> {
        const { error } = await supabase.from('weight_goals').insert({
            id: goal.id,
            user_id: goal.userId,
            target_weight_kg: goal.targetWeightKg,
            started_at: goal.startedAt.toISOString(),
            created_at: goal.createdAt.toISOString(),
        });
        if (error) throw new Error(`Failed to save weight goal: ${error.message}`);
    }
}
