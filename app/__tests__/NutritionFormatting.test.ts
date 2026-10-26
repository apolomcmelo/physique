import { FoodItem } from '../../src/domain/entities/FoodItem';
import { formatMacroLine, formatNutrientValue } from '../food/format';

function itemWithValues(values: Array<{ label: string; amount: number | null; unit: string | null }>): FoodItem {
    const columnId = 'serving';
    return {
        id: 'f1',
        name: 'Aveia',
        brandOrSource: 'Marca X',
        nutritionColumns: [{ id: columnId, label: 'Porção', basisAmount: 100, basisUnit: 'g' }],
        nutrients: values.map(({ label, amount, unit }, index) => ({
            id: `n${index}`,
            label,
            values: [{
                columnId,
                amount,
                unit,
                dailyValuePercent: null,
                certainty: amount === null ? 'unknown' : 'confirmed',
                origin: 'manual',
            }],
        })),
        ingredients: 'Aveia integral',
        rawOcrText: null,
        originalImagePath: null,
        availableForPlanning: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}

describe('Nutrition display formatting', () => {
    it('formats measured nutrients and Brazilian decimal separators', () => {
        const item = itemWithValues([
            { label: 'Calorias', amount: 123.5, unit: 'kcal' },
            { label: 'Proteínas', amount: 2.5, unit: 'g' },
            { label: 'Carboidratos', amount: 10, unit: 'g' },
            { label: 'Gorduras totais', amount: 1.5, unit: 'g' },
        ]);

        expect(formatMacroLine(item)).toBe('Energia 123,5 kcal • P 2,5g • C 10g • G 1,5g');
    });

    it('distinguishes a confirmed zero from an unknown value', () => {
        const item = itemWithValues([
            { label: 'Calorias', amount: 0, unit: 'kcal' },
            { label: 'Sódio', amount: null, unit: 'mg' },
        ]);

        expect(formatMacroLine(item)).toContain('Energia 0 kcal');
        expect(formatNutrientValue(item.nutrients[1], item.nutrients[1].values[0])).toBe('Sódio: Desconhecido');
    });
});
