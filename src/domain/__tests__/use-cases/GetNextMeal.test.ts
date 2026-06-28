import { getNextMeal } from '../../use-cases/meal/GetNextMeal';
import { MealPlanEntry } from '../../entities/MealPlan';

function makeMealEntry(overrides: Partial<MealPlanEntry>): MealPlanEntry {
    return {
        id: 'meal-1',
        day: '1',
        time: '08:00',
        activity: 'Breakfast',
        description: 'Oats',
        biologicalObjective: 'Energy',
        ...overrides,
    };
}

describe('getNextMeal', () => {
    it('returns the meal scheduled after current time', () => {
        // 8:30 — morning meal at 7:00 is past, lunch at 9:00 is next
        const now = new Date(2024, 0, 1, 8, 30);
        const entries = [
            makeMealEntry({ id: 'meal-1', time: '07:00', activity: 'Breakfast' }),
            makeMealEntry({ id: 'meal-2', time: '09:00', activity: 'Snack' }),
        ];

        const result = getNextMeal(entries, now);

        expect(result).not.toBeNull();
        expect(result!.time).toBe('09:00');
        expect(result!.activity).toBe('Snack');
    });

    it('returns null if no meals available', () => {
        const now = new Date(2024, 0, 1, 8, 30);
        const result = getNextMeal([], now);
        expect(result).toBeNull();
    });

    it('returns null if current time is after all meals', () => {
        const now = new Date(2024, 0, 1, 23, 0);
        const entries = [
            makeMealEntry({ id: 'meal-1', time: '07:00', activity: 'Breakfast' }),
            makeMealEntry({ id: 'meal-2', time: '12:00', activity: 'Lunch' }),
        ];

        const result = getNextMeal(entries, now);
        expect(result).toBeNull();
    });

    it('returns first meal if current time is before all meals', () => {
        const now = new Date(2024, 0, 1, 6, 0);
        const entries = [
            makeMealEntry({ id: 'meal-1', time: '07:00', activity: 'Breakfast' }),
            makeMealEntry({ id: 'meal-2', time: '12:00', activity: 'Lunch' }),
        ];

        const result = getNextMeal(entries, now);

        expect(result).not.toBeNull();
        expect(result!.time).toBe('07:00');
        expect(result!.activity).toBe('Breakfast');
    });
});
