import { LocalMealPlanRepository } from '../local/LocalMealPlanRepository';
import { MealPlanEntry } from '../../domain/entities/MealPlan';

let mockStored: MealPlanEntry[] = [{ id: 'old', day: 'Monday', time: '08:00', activity: 'Breakfast', description: 'Eggs', biologicalObjective: 'Energy' }];
const mockWrite = jest.fn(async (_key: string, entries: MealPlanEntry[]) => { throw new Error('quota exceeded'); });
jest.mock('../local/LocalStorage', () => ({ getItem: jest.fn(async (key: string) => key === '@physique/meal_plan' ? mockStored : null), setItem: (key: string, entries: MealPlanEntry[]) => mockWrite(key, entries) }));

it('keeps the previous plan if local storage rejects the replacement', async () => {
    const repo = new LocalMealPlanRepository();
    const before = await repo.getMealPlanEntries();
    await expect(repo.saveMealPlanEntries([{ ...before[0], id: 'new' }])).rejects.toThrow('quota exceeded');
    expect(await repo.getMealPlanEntries()).toEqual(before);
});
