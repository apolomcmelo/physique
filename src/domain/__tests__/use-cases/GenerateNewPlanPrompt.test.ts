import { generateNewPlanPrompt } from '../../use-cases/prompt/GenerateNewPlanPrompt';
import { createFoodItem } from '../../entities/FoodItem';
import { mockUser } from '../setup';

describe('generateNewPlanPrompt', () => {
    const result = generateNewPlanPrompt(mockUser, [], [], []);

    it('returns a non-empty string', () => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it("contains user's name in the output", () => {
        expect(result).toContain(mockUser.name);
    });

    it('does not claim the profile weight is a current measurement when history is empty', () => {
        expect(result).toContain('Current Weight: Unknown kg');
    });

    it("contains user's goal weight in the output", () => {
        expect(result).toContain(String(mockUser.goalWeight));
    });

    it("contains user's objective in the output", () => {
        expect(result).toContain(mockUser.objective);
    });

    it('includes the complete nutritional table for enabled foods and excludes disabled foods', () => {
        const enabled = createFoodItem({
            name: 'Cereal',
            brandOrSource: 'Marca',
            nutritionColumns: [{ id: 'portion', label: 'Porção', basisAmount: 30, basisUnit: 'g' }],
            nutrients: [{
                id: 'vitamin-c',
                label: 'Vitamina C',
                values: [{
                    columnId: 'portion', amount: 12, unit: 'mg', dailyValuePercent: 20,
                    certainty: 'confirmed', origin: 'label',
                }],
            }, {
                id: 'iron',
                label: 'Ferro',
                values: [{
                    columnId: 'portion', amount: 3, unit: 'mg', dailyValuePercent: null,
                    certainty: 'uncertain', origin: 'label',
                }],
            }],
            ingredients: 'Aveia e vitamina C',
            rawOcrText: 'vitamina c 12mg',
            originalImagePath: null,
            availableForPlanning: true,
        });
        const disabled = { ...enabled, id: 'disabled', name: 'Alimento desabilitado', availableForPlanning: false };
        const prompt = generateNewPlanPrompt(mockUser, [], [], [enabled, disabled]);

        expect(prompt).toContain('Vitamina C: 12 mg, 20% daily value per Porção (30 g)');
        expect(prompt).toContain('40 mg, calculated per 100 g');
        expect(prompt).toContain('3 mg, OCR uncertain per Porção (30 g)');
        expect(prompt).toContain('10 mg, OCR uncertain, calculated per 100 g');
        expect(prompt).toContain('Ingredients: Aveia e vitamina C');
        expect(prompt).not.toContain('Alimento desabilitado');
    });

    it('contains CSV header structure and workout rules with rest intervals', () => {
        expect(result).toContain('dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo');
        expect(result).toContain('Calistenia');
        expect(result).toContain('Musculação');
        expect(result).toContain('HIT');
        expect(result).toContain('descanso');
        expect(result).toContain('transição');
    });
});
