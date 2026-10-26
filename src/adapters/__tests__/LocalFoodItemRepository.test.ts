import { LocalFoodItemRepository } from '../local/LocalFoodItemRepository';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('../local/LocalStorage', () => ({
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
}));

describe('LocalFoodItemRepository', () => {
    let repository: LocalFoodItemRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new LocalFoodItemRepository();
    });

    it('migrates and persists legacy macro-only catalog items on read', async () => {
        mockGetItem.mockResolvedValue([{
            id: 'legacy-food',
            name: 'Aveia legada',
            brandOrSource: 'Marca',
            servingSizeGrams: 40,
            calories: 150,
            proteinGrams: 5,
            carbsGrams: 27,
            fatGrams: 3,
            ingredients: 'Aveia',
            rawOcrText: 'Calorias 150 kcal',
            createdAt: '2024-01-01T00:00:00.000Z',
        }]);

        const [item] = await repository.getFoodItems();

        expect(item).toMatchObject({
            id: 'legacy-food',
            name: 'Aveia legada',
            nutritionColumns: [{ id: 'serving', label: 'Porção', basisAmount: 40, basisUnit: 'g' }],
            nutrients: [
                { id: 'energy', label: 'Calorias', values: [expect.objectContaining({ amount: 150, unit: 'kcal' })] },
                { id: 'protein', label: 'Proteínas', values: [expect.objectContaining({ amount: 5, unit: 'g' })] },
                { id: 'carbohydrates', label: 'Carboidratos', values: [expect.objectContaining({ amount: 27, unit: 'g' })] },
                { id: 'total-fat', label: 'Gorduras totais', values: [expect.objectContaining({ amount: 3, unit: 'g' })] },
            ],
            ingredients: 'Aveia',
            rawOcrText: 'Calorias 150 kcal',
            originalImagePath: null,
            availableForPlanning: true,
        });
        expect(item.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
        expect(mockSetItem).toHaveBeenCalledWith('@physique/food_items', [item]);
    });

    it('does not rewrite already structured catalog items', async () => {
        mockGetItem.mockResolvedValue([{
            id: 'new-food',
            name: 'Novo alimento',
            brandOrSource: null,
            nutritionColumns: [{ id: 'portion', label: 'Porção', basisAmount: null, basisUnit: null }],
            nutrients: [],
            ingredients: null,
            rawOcrText: null,
            originalImagePath: null,
            availableForPlanning: true,
            createdAt: '2024-01-01T00:00:00.000Z',
        }]);

        const [item] = await repository.getFoodItems();

        expect(item.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
        expect(mockSetItem).not.toHaveBeenCalled();
    });
});
