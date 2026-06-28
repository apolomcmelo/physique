import { createMealPlanEntry } from '../../entities/MealPlan';

const validParams = {
    day: '1',
    time: '08:30',
    activity: 'Café da Manhã',
    description: 'Aveia com frutas',
    biologicalObjective: 'Energia para o dia',
};

describe('createMealPlanEntry', () => {
    it('creates a valid entry with all fields', () => {
        const entry = createMealPlanEntry(validParams);
        expect(entry.day).toBe('1');
        expect(entry.time).toBe('08:30');
        expect(entry.activity).toBe('Café da Manhã');
        expect(entry.description).toBe('Aveia com frutas');
        expect(entry.biologicalObjective).toBe('Energia para o dia');
        expect(entry.id).toBeDefined();
    });

    it('throws if time is empty', () => {
        expect(() => createMealPlanEntry({ ...validParams, time: '' })).toThrow('Time is required');
    });

    it('throws if activity is empty', () => {
        expect(() => createMealPlanEntry({ ...validParams, activity: '' })).toThrow(
            'Activity is required',
        );
    });

    it('throws if description is empty', () => {
        expect(() => createMealPlanEntry({ ...validParams, description: '' })).toThrow(
            'Description is required',
        );
    });
});
