import { MealPlanEntry } from '../entities/MealPlan';

export interface IMealPlanRepository {
    getMealPlanEntries(): Promise<MealPlanEntry[]>;
    saveMealPlanEntries(entries: MealPlanEntry[]): Promise<void>;
    clearMealPlan(): Promise<void>;
}
