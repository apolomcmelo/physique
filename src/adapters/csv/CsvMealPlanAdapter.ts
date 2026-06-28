import { parseCsvMealPlan } from '../../domain/use-cases/meal/ParseCsvMealPlan';
import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { MealPlanEntry } from '../../domain/entities/MealPlan';

export async function importCsvMealPlan(
    csvContent: string,
    repo: IMealPlanRepository,
): Promise<MealPlanEntry[]> {
    const entries = parseCsvMealPlan(csvContent);
    await repo.clearMealPlan();
    await repo.saveMealPlanEntries(entries);
    return entries;
}
