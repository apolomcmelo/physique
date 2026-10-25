import { generateId } from '../value-objects/UUID';

export type MealConsumptionStatus = 'consumed' | 'skipped';

export interface MealConsumption {
    id: string;
    userId: string;
    plannedMealId: string | null;
    activity: string;
    description: string;
    notes: string | null;
    status: MealConsumptionStatus;
    recordedAt: Date;
}

export type CreateMealConsumptionParams = Omit<MealConsumption, 'id'>;

export function createMealConsumption(params: CreateMealConsumptionParams): MealConsumption {
    if (!params.userId.trim()) throw new Error('User ID is required');
    if (!params.activity.trim()) throw new Error('Meal activity is required');
    if (!params.description.trim()) throw new Error('Meal description is required');
    if (!(params.recordedAt instanceof Date) || Number.isNaN(params.recordedAt.getTime())) {
        throw new Error('Meal date and time must be valid');
    }
    if (params.status !== 'consumed' && params.status !== 'skipped') {
        throw new Error('Meal status must be consumed or skipped');
    }
    return {
        ...params,
        activity: params.activity.trim(),
        description: params.description.trim(),
        notes: params.notes?.trim() || null,
        id: generateId(),
    };
}
