import { createMealConsumption } from '../../entities/MealConsumption';

describe('createMealConsumption', () => {
    const required = {
        userId: 'user-1',
        plannedMealId: 'routine-1:0',
        activity: 'Almoço',
        description: 'Arroz e feijão',
        notes: null,
        status: 'consumed' as const,
        recordedAt: new Date('2026-10-25T12:30:00'),
    };

    it('creates an independent snapshot of consumed meal details', () => {
        const result = createMealConsumption(required);
        expect(result).toMatchObject(required);
        expect(result.id).toBeTruthy();
    });

    it('supports skipped and unplanned meals', () => {
        expect(createMealConsumption({ ...required, plannedMealId: null, status: 'skipped' }).status).toBe('skipped');
    });

    it.each([
        [{ ...required, userId: '' }, 'User ID is required'],
        [{ ...required, activity: ' ' }, 'Meal activity is required'],
        [{ ...required, description: '' }, 'Meal description is required'],
        [{ ...required, recordedAt: new Date(Number.NaN) }, 'Meal date and time must be valid'],
    ])('rejects invalid meal records', (params, message) => {
        expect(() => createMealConsumption(params)).toThrow(message);
    });
});
