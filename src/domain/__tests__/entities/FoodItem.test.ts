import { createFoodItem, derivePer100g } from '../../entities/FoodItem';

function createSample(amount: number | null) {
    return createFoodItem({
        name: 'Rótulo',
        brandOrSource: null,
        nutritionColumns: [{ id: 'serving', label: 'Porção', basisAmount: 30, basisUnit: 'g' }],
        nutrients: [{
            id: 'sodium',
            label: 'Sódio',
            values: [{
                columnId: 'serving',
                amount,
                unit: amount === null ? null : 'mg',
                dailyValuePercent: null,
                certainty: amount === null ? 'unknown' : 'confirmed',
                origin: 'manual',
            }],
        }],
        ingredients: null,
        rawOcrText: null,
        originalImagePath: null,
        availableForPlanning: true,
    });
}

describe('FoodItem', () => {
    it('allows a reviewed but incomplete table and preserves unknown separately from zero', () => {
        const unknown = createSample(null);
        const zero = createSample(0);

        expect(unknown.nutrients[0].values[0].certainty).toBe('unknown');
        expect(unknown.nutrients[0].values[0].amount).toBeNull();
        expect(zero.nutrients[0].values[0].amount).toBe(0);
        expect(zero.nutrients[0].values[0].certainty).toBe('confirmed');
    });

    it('derives a per-100-gram value only from a known mass basis', () => {
        const item = createSample(15);
        expect(derivePer100g(item.nutrients[0], item.nutritionColumns)).toEqual(expect.objectContaining({
            amount: 50,
            unit: 'mg',
            origin: 'derived',
        }));

        const volumeColumn = [{ id: 'serving', label: 'Porção', basisAmount: 30, basisUnit: 'ml' }];
        expect(derivePer100g(item.nutrients[0], volumeColumn)).toBeNull();
    });

    it('rejects values attached to a missing nutrition basis', () => {
        expect(() => createFoodItem({
            name: 'Rótulo',
            brandOrSource: null,
            nutritionColumns: [{ id: 'serving', label: 'Porção', basisAmount: null, basisUnit: null }],
            nutrients: [{
                id: 'sodium',
                label: 'Sódio',
                values: [{
                    columnId: 'unknown',
                    amount: 10,
                    unit: 'mg',
                    dailyValuePercent: null,
                    certainty: 'confirmed',
                    origin: 'manual',
                }],
            }],
            ingredients: null,
            rawOcrText: null,
            originalImagePath: null,
            availableForPlanning: true,
        })).toThrow('Nutrient value refers to an unknown basis');
    });
});
