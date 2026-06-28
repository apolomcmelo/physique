import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { WeightRecord } from '../../domain/entities/WeightRecord';
import { supabase } from '../../infrastructure/supabase/client';

interface WeightRecordRow {
    id: string;
    user_id: string;
    weight_kg: number;
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

    async getLatestWeight(): Promise<WeightRecord | null> {
        const { data, error } = await supabase
            .from('weight_records')
            .select('*')
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get latest weight: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return rowToWeightRecord(data as WeightRecordRow);
    }
}
