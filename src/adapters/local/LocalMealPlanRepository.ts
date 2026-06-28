import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/meal_plan';

export class LocalMealPlanRepository implements IMealPlanRepository {
    async getMealPlanEntries(): Promise<MealPlanEntry[]> {
        return (await getItem<MealPlanEntry[]>(KEY)) ?? [];
    }

    async saveMealPlanEntries(entries: MealPlanEntry[]): Promise<void> {
        await setItem(KEY, entries);
    }

    async clearMealPlan(): Promise<void> {
        await setItem(KEY, []);
    }
}
