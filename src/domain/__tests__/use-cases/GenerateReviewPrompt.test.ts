import { generateReviewPrompt } from '../../use-cases/prompt/GenerateReviewPrompt';
import { mockUser, mockWeightRecord } from '../setup';
import { WorkoutSession } from '../../entities/WorkoutSession';
import { MealConsumption } from '../../entities/MealConsumption';
import { createFoodItem } from '../../entities/FoodItem';

const mockWorkoutSession: WorkoutSession = {
    id: 'session-1',
    workoutId: 'workout-1',
    startedAt: new Date(2024, 0, 1, 10, 0),
    finishedAt: new Date(2024, 0, 1, 11, 0),
    sets: [
        {
            id: 'set-1',
            exerciseId: 'exercise-1',
            setNumber: 1,
            repsCompleted: 10,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 10),
        },
        {
            id: 'set-2',
            exerciseId: 'exercise-1',
            setNumber: 2,
            repsCompleted: 10,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 20),
        },
        {
            id: 'set-3',
            exerciseId: 'exercise-1',
            setNumber: 3,
            repsCompleted: 8,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 30),
        },
    ],
};

describe('generateReviewPrompt', () => {
    const result = generateReviewPrompt(
        mockUser,
        [mockWeightRecord],
        [mockWorkoutSession],
        [],
        [],
        [],
    );

    it('returns a non-empty string', () => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it("contains user's name in the output", () => {
        expect(result).toContain(mockUser.name);
    });

    it('contains weight history data', () => {
        expect(result).toContain(`${mockWeightRecord.weightKg}kg`);
    });

    it('uses the latest value per indicator and does not fall back to profile measurements', () => {
        const bodyFatOnly = {
            ...mockWeightRecord,
            id: 'body-fat-only',
            weightKg: null,
            bodyFatPercentage: 17.5,
            recordedAt: new Date('2026-10-25T10:00:00.000Z'),
        };
        const prompt = generateReviewPrompt(mockUser, [bodyFatOnly], [], [], [], []);
        expect(prompt).toContain('Current Weight: Unknown kg');
        expect(prompt).toContain('Body Fat Percentage: 17.5%');
        expect(prompt).toContain('Weight History\n- 2026-10-25: 17.5% body fat');
    });

    it('contains workout session count', () => {
        // The summary includes "${s.sets.length} sets completed"
        expect(result).toContain(`${mockWorkoutSession.sets.length} sets completed`);
    });

    it('includes actual consumed and skipped meals rather than scheduled meal-plan rows', () => {
        const consumed: MealConsumption = {
            id: 'meal-1', userId: 'user-1', plannedMealId: 'plan-1',
            activity: 'Almoço', description: 'Arroz e feijão', notes: 'Porção menor',
            status: 'consumed', recordedAt: new Date('2026-10-25T12:00:00.000Z'),
        };
        const skipped: MealConsumption = {
            ...consumed, id: 'meal-2', activity: 'Lanche', description: 'Sem fome',
            notes: null, status: 'skipped', recordedAt: new Date('2026-10-25T15:00:00.000Z'),
        };
        const prompt = generateReviewPrompt(mockUser, [], [], [], [consumed, skipped], []);
        expect(prompt).toContain('Actual Meal Consumption');
        expect(prompt).toContain('Consumed | Almoço: Arroz e feijão (notes: Porção menor)');
        expect(prompt).toContain('Skipped | Lanche: Sem fome');
        expect(prompt).not.toContain('Current Meal Plan');
    });

    it('includes the complete nutrition table only for foods enabled for planning', () => {
        const food = createFoodItem({
            name: 'Rótulo completo',
            brandOrSource: null,
            nutritionColumns: [{ id: '100ml', label: 'Por 100 ml', basisAmount: 100, basisUnit: 'ml' }],
            nutrients: [{
                id: 'sodium',
                label: 'Sódio',
                values: [{
                    columnId: '100ml', amount: 0, unit: 'mg', dailyValuePercent: 0,
                    certainty: 'confirmed', origin: 'label',
                }],
            }],
            ingredients: null,
            rawOcrText: null,
            originalImagePath: null,
            availableForPlanning: true,
        });
        const disabled = { ...food, id: 'disabled', name: 'Not available', availableForPlanning: false };
        const prompt = generateReviewPrompt(mockUser, [], [], [], [], [food, disabled]);

        expect(prompt).toContain('Sódio: 0 mg, 0% daily value per Por 100 ml (100 ml)');
        expect(prompt).not.toContain('Not available');
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
