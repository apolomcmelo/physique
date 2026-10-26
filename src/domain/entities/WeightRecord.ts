import { generateId } from '../value-objects/UUID';

export interface WeightRecord {
    id: string;
    userId: string;
    weightKg: number | null;
    bodyFatPercentage: number | null;
    proteinPercentage: number | null;
    recordedAt: Date;
}

export type CreateWeightRecordParams = Omit<WeightRecord, 'id'>;

export function createWeightRecord(params: CreateWeightRecordParams): WeightRecord {
    if (!params.userId || params.userId.trim().length === 0) {
        throw new Error('User ID is required');
    }
    if (params.weightKg !== null && (!Number.isFinite(params.weightKg) || params.weightKg <= 0)) {
        throw new Error('Weight must be greater than 0');
    }
    if (params.bodyFatPercentage !== null
        && (!Number.isFinite(params.bodyFatPercentage) || params.bodyFatPercentage < 0 || params.bodyFatPercentage > 100)) {
        throw new Error('Body fat percentage must be between 0 and 100');
    }
    if (params.proteinPercentage !== null
        && (!Number.isFinite(params.proteinPercentage) || params.proteinPercentage < 0 || params.proteinPercentage > 100)) {
        throw new Error('Protein percentage must be between 0 and 100');
    }
    if (!Number.isFinite(params.recordedAt.getTime())) {
        throw new Error('Recorded at must be a valid date');
    }
    if (params.weightKg === null && params.bodyFatPercentage === null && params.proteinPercentage === null) {
        throw new Error('At least one measurement is required');
    }
    return {
        ...params,
        id: generateId(),
    };
}
