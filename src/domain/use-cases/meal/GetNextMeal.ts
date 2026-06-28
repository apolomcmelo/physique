import { MealPlanEntry } from '../../entities/MealPlan';

function timeToMinutes(time: string): number {
    const parts = time.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
}

export function getNextMeal(entries: MealPlanEntry[], now: Date): MealPlanEntry | null {
    if (entries.length === 0) return null;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const upcoming = entries
        .filter((e) => timeToMinutes(e.time) > currentMinutes)
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    return upcoming[0] ?? null;
}
