import { parseNutritionLabelText } from '../ocr/NutritionLabelParser';

describe('parseNutritionLabelText', () => {
    it('keeps multiple bases, daily values, zero and decimal-comma nutrients distinct', () => {
        const result = parseNutritionLabelText([
            'Porção (30 g) | Por 100 g',
            'Vitamina C 12,5 mg 10% 41,7 mg 33%',
            'Calorias 0 kcal 0% 0 kcal 0%',
        ].join('\n'));

        expect(result.columns).toEqual([
            { id: 'ocr-column-1', label: 'Porção', basisAmount: 30, basisUnit: 'g' },
            { id: 'ocr-column-2', label: 'Por 100 g', basisAmount: 100, basisUnit: 'g' },
        ]);
        expect(result.nutrients[0].values).toEqual([
            expect.objectContaining({ amount: 12.5, unit: 'mg', dailyValuePercent: 10, certainty: 'uncertain' }),
            expect.objectContaining({ amount: 41.7, unit: 'mg', dailyValuePercent: 33, certainty: 'uncertain' }),
        ]);
        expect(result.nutrients[1].values[0]).toEqual(expect.objectContaining({
            amount: 0,
            unit: 'kcal',
            dailyValuePercent: 0,
        }));
    });

    it('does not treat total sugars as total carbohydrates', () => {
        const result = parseNutritionLabelText('Carboidratos 14 g\nAçúcares totais 6 g');

        expect(result.nutrients.map((row) => row.label)).toEqual(['Carboidratos', 'Açúcares totais']);
        expect(result.nutrients[0].values[0].amount).toBe(14);
        expect(result.nutrients[1].values[0].amount).toBe(6);
    });

    it('does not truncate malformed OCR numbers', () => {
        const result = parseNutritionLabelText('Calorias 123,4.5 kcal');

        expect(result.nutrients).toEqual([]);
    });

    it('preserves nutrient names not known to the parser', () => {
        const result = parseNutritionLabelText('Colina 120 mg');

        expect(result.nutrients[0].label).toBe('Colina');
        expect(result.nutrients[0].values[0]).toEqual(expect.objectContaining({
            amount: 120,
            unit: 'mg',
        }));
    });

    it('preserves microgram units and volume bases without deriving mass values', () => {
        const result = parseNutritionLabelText([
            'Por 100 ml',
            'Vitamina D 5 µg 25%',
            'Vitamina A 12 mcg',
        ].join('\n'));

        expect(result.columns[0]).toMatchObject({
            label: 'Por 100 ml',
            basisAmount: 100,
            basisUnit: 'ml',
        });
        expect(result.nutrients.map((nutrient) => nutrient.values[0])).toEqual([
            expect.objectContaining({ amount: 5, unit: 'µg', dailyValuePercent: 25 }),
            expect.objectContaining({ amount: 12, unit: 'µg' }),
        ]);
    });

    it('leaves every basis unknown when OCR has fewer values than recognized columns', () => {
        const result = parseNutritionLabelText([
            'Porção (30 g) | Por 100 g',
            'Proteínas 8 g',
        ].join('\n'));

        expect(result.nutrients[0].values).toEqual([
            expect.objectContaining({ amount: null, certainty: 'unknown' }),
            expect.objectContaining({ amount: null, certainty: 'unknown' }),
        ]);
    });
});
