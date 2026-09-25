import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { Workout } from '../../domain/entities/Workout';
import { getAccountId, getItem, setItemForAccount } from './LocalStorage';

export const PLAN_KEY = '@physique/combined_plan';

export interface LocalPlanSnapshot {
    meals: MealPlanEntry[];
    workouts: Workout[];
    importIds: string[];
}

export function getLocalPlan(): Promise<LocalPlanSnapshot | null> {
    return getItem<LocalPlanSnapshot>(PLAN_KEY);
}

const pendingWrites = new Map<string, Promise<void>>();

export async function withLocalPlanWrite<T>(operation: (accountId: string) => Promise<T>): Promise<T> {
    const accountId = await getAccountId();
    const previous = pendingWrites.get(accountId) ?? Promise.resolve();
    const result = previous.catch(() => {}).then(() => operation(accountId));
    const settled = result.then(() => {}, () => {});
    pendingWrites.set(accountId, settled);
    try { return await result; }
    finally { if (pendingWrites.get(accountId) === settled) pendingWrites.delete(accountId); }
}

export async function saveLocalPlanImport(meals: MealPlanEntry[], workouts: Workout[], importId: string): Promise<void> {
    await withLocalPlanWrite(async (accountId) => {
        const previous = await getLocalPlan();
        if (previous?.importIds.includes(importId)) return;
        const existingMeals = previous?.meals ?? await getItem<MealPlanEntry[]>('@physique/meal_plan') ?? [];
        const existingWorkouts = previous?.workouts ?? await getItem<Workout[]>('@physique/workouts') ?? [];
        const newMeals = meals.filter((meal) => !existingMeals.some((existing) => existing.id === meal.id));
        const newWorkouts = workouts.filter((workout) => !existingWorkouts.some((existing) => existing.id === workout.id));
        await setItemForAccount(PLAN_KEY, {
            meals: [...existingMeals, ...newMeals], workouts: [...existingWorkouts, ...newWorkouts],
            importIds: [...(previous?.importIds ?? []), importId],
        }, accountId);
    });
}
