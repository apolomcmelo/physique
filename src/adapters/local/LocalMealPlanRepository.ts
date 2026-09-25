import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { getItem, setItem, setItemForAccount } from './LocalStorage';
import { getLocalPlan, PLAN_KEY, withLocalPlanWrite } from './SavePlanImport';

const KEY = '@physique/meal_plan';

export class LocalMealPlanRepository implements IMealPlanRepository {
    async getMealPlanEntries(): Promise<MealPlanEntry[]> {
        const plan = await getLocalPlan();
        if (plan) return plan.meals;
        return (await getItem<MealPlanEntry[]>(KEY)) ?? [];
    }

    async saveMealPlanEntries(entries: MealPlanEntry[]): Promise<void> {
        const plan = await getLocalPlan();
        if (plan) {
            await withLocalPlanWrite(async (accountId) => {
                const current = await getLocalPlan();
                if (current) await setItemForAccount(PLAN_KEY, { ...current, meals: entries }, accountId);
            });
            return;
        }
        await setItem(KEY, entries);
    }

    async clearMealPlan(): Promise<void> {
        await this.saveMealPlanEntries([]);
    }
}
