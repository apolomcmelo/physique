import { FoodItem } from '../../src/domain/entities/FoodItem';
import { formatMacroLine } from '../food/format';

describe('NutritionScreen formatMacroLine', () => {
    it('formats kcal and macros for each food item', () => {
        const item: FoodItem = {
            id: 'f1',
            name: 'Aveia',
            brandOrSource: 'Marca X',
            servingSizeGrams: 100,
            calories: 389,
            proteinGrams: 17,
            carbsGrams: 66,
            fatGrams: 7,
            ingredients: 'Aveia integral',
            rawOcrText: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        expect(formatMacroLine(item)).toBe('389 kcal • P 17g • C 66g • G 7g');
    });
});
