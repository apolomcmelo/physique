import { LocalMealConsumptionRepository } from '../local/LocalMealConsumptionRepository';
import { MealConsumption } from '../../domain/entities/MealConsumption';

let mockStored: MealConsumption[] = [];
const mockAccountId = jest.fn(async () => 'user-1');
const mockSetForAccount = jest.fn(async (_key: string, value: MealConsumption[]) => {
    mockStored = value;
});

jest.mock('../local/LocalStorage', () => ({
    getAccountId: () => mockAccountId(),
    getItem: jest.fn(async () => mockStored),
    setItemForAccount: (key: string, value: MealConsumption[]) => mockSetForAccount(key, value),
}));

describe('LocalMealConsumptionRepository', () => {
    beforeEach(() => {
        mockStored = [];
        jest.clearAllMocks();
    });

    it('persists account-scoped records and revives their timestamps', async () => {
        const repository = new LocalMealConsumptionRepository();
        const record: MealConsumption = {
            id: 'record-1',
            userId: 'user-1',
            plannedMealId: 'routine-1:0',
            activity: 'Almoço',
            description: 'Arroz e feijão',
            notes: null,
            status: 'consumed',
            recordedAt: new Date('2026-10-25T12:00:00Z'),
        };

        await repository.saveMealConsumption(record);
        const result = await repository.getMealConsumptions();

        expect(mockSetForAccount).toHaveBeenCalledWith('@physique/meal_consumptions', [record]);
        expect(result[0].recordedAt).toBeInstanceOf(Date);
        expect(result[0].recordedAt.getTime()).toBe(record.recordedAt.getTime());
    });

    it('updates and deletes only the selected record', async () => {
        const repository = new LocalMealConsumptionRepository();
        mockStored = [
            { id: 'first', userId: 'user-1', plannedMealId: null, activity: 'Lanche', description: 'Maçã', notes: null, status: 'consumed', recordedAt: new Date() },
            { id: 'second', userId: 'user-1', plannedMealId: null, activity: 'Jantar', description: 'Sopa', notes: null, status: 'skipped', recordedAt: new Date() },
        ];

        await repository.saveMealConsumption({ ...mockStored[0], description: 'Banana' });
        expect(mockStored.map((record) => record.description)).toEqual(['Banana', 'Sopa']);

        await repository.deleteMealConsumption('first');
        expect(mockStored.map((record) => record.id)).toEqual(['second']);
    });
});
