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

    it('formats fractional nutrition values with Brazilian decimal separators', () => {
        const item: FoodItem = {
            id: 'f2',
            name: 'Aveia',
            brandOrSource: null,
            servingSizeGrams: 12.5,
            calories: 123.5,
            proteinGrams: 2.5,
            carbsGrams: 10,
            fatGrams: 1.5,
            ingredients: null,
            rawOcrText: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        expect(formatMacroLine(item)).toBe('123,5 kcal • P 2,5g • C 10g • G 1,5g');
    });
});
