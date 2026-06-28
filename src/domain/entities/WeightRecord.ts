import { generateId } from '../value-objects/UUID';

export interface WeightRecord {
    id: string;
    userId: string;
    weightKg: number;
    bodyFatPercentage: number | null;
    proteinPercentage: number | null;
    recordedAt: Date;
}

export type CreateWeightRecordParams = Omit<WeightRecord, 'id'>;

export function createWeightRecord(params: CreateWeightRecordParams): WeightRecord {
    if (!params.userId || params.userId.trim().length === 0) {
        throw new Error('User ID is required');
    }
    if (params.weightKg <= 0) {
        throw new Error('Weight must be greater than 0');
    }
    return {
        ...params,
        id: generateId(),
    };
}
