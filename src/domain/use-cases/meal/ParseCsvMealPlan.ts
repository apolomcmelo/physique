import { MealPlanEntry, createMealPlanEntry } from '../../entities/MealPlan';

export function parseCsvMealPlan(csvContent: string): MealPlanEntry[] {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    // Skip header row
    const dataLines = lines.slice(1);

    const entries: MealPlanEntry[] = [];

    for (const line of dataLines) {
        const columns = line.split(';');

        if (columns.length < 5) {
            continue;
        }

        const [day, time, activity, description, biologicalObjective] = columns.map((c) => c.trim());

        if (!day || !time || !activity || !description || !biologicalObjective) {
            continue;
        }

        entries.push(
            createMealPlanEntry({
                day,
                time,
                activity,
                description,
                biologicalObjective,
            }),
        );
    }

    return entries;
}
