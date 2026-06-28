import { generateId } from '../value-objects/UUID';

export interface MealPlanEntry {
    id: string;
    day: string;
    time: string;
    activity: string;
    description: string;
    biologicalObjective: string;
}

export type CreateMealPlanEntryParams = Omit<MealPlanEntry, 'id'>;

export function createMealPlanEntry(params: CreateMealPlanEntryParams): MealPlanEntry {
    if (!params.day || params.day.trim().length === 0) {
        throw new Error('Day is required');
    }
    if (!params.time || params.time.trim().length === 0) {
        throw new Error('Time is required');
    }
    if (!params.activity || params.activity.trim().length === 0) {
        throw new Error('Activity is required');
    }
    if (!params.description || params.description.trim().length === 0) {
        throw new Error('Description is required');
    }
    if (!params.biologicalObjective || params.biologicalObjective.trim().length === 0) {
        throw new Error('Biological objective is required');
    }
    return {
        ...params,
        id: generateId(),
    };
}
