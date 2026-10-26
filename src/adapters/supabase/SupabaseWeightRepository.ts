import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { WeightRecord } from '../../domain/entities/WeightRecord';
import { supabase } from '../../infrastructure/supabase/client';

interface WeightRecordRow {
    id: string;
    user_id: string;
    weight_kg: number | null;
    body_fat_percentage: number | null;
    protein_percentage: number | null;
    recorded_at: string;
    created_at: string;
}

function rowToWeightRecord(row: WeightRecordRow): WeightRecord {
    return {
        id: row.id,
        userId: row.user_id,
        weightKg: row.weight_kg,
        bodyFatPercentage: row.body_fat_percentage,
        proteinPercentage: row.protein_percentage,
        recordedAt: new Date(row.recorded_at),
    };
}

function weightRecordToRow(record: WeightRecord): Omit<WeightRecordRow, 'created_at'> {
    return {
        id: record.id,
        user_id: record.userId,
        weight_kg: record.weightKg,
        body_fat_percentage: record.bodyFatPercentage,
        protein_percentage: record.proteinPercentage,
        recorded_at: record.recordedAt.toISOString(),
    };
}

export class SupabaseWeightRepository implements IWeightRepository {
    async getWeightHistory(): Promise<WeightRecord[]> {
        const { data, error } = await supabase
            .from('weight_records')
            .select('*')
            .order('recorded_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get weight history: ${error.message}`);
        }

        return (data as WeightRecordRow[]).map(rowToWeightRecord);
    }

    async saveWeightRecord(record: WeightRecord): Promise<void> {
        const row = {
            ...weightRecordToRow(record),
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('weight_records').insert(row);

        if (error) {
            throw new Error(`Failed to save weight record: ${error.message}`);
        }
    }

    async updateWeightRecord(record: WeightRecord): Promise<void> {
        const { data, error } = await supabase
            .from('weight_records')
            .update(weightRecordToRow(record))
            .eq('id', record.id)
            .eq('user_id', record.userId)
            .select('id')
            .maybeSingle();
        if (error) throw new Error(`Failed to update weight record: ${error.message}`);
        if (!data) throw new Error('Failed to update weight record: record not found or not owned by current user');
    }

    async deleteWeightRecord(id: string): Promise<void> {
        const { data, error } = await supabase
            .from('weight_records')
            .delete()
            .eq('id', id)
            .select('id')
            .maybeSingle();
        if (error) throw new Error(`Failed to delete weight record: ${error.message}`);
        if (!data) throw new Error('Failed to delete weight record: record not found or not owned by current user');
    }

    async getLatestWeight(): Promise<WeightRecord | null> {
        const { data, error } = await supabase
            .from('weight_records')
            .select('*')
            .not('weight_kg', 'is', null)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to get latest weight: ${error.message}`);
        }

        return data ? rowToWeightRecord(data as WeightRecordRow) : null;
    }
}
