import { SupabaseFoodItemRepository } from '../supabase/SupabaseFoodItemRepository';
import { FoodItem } from '../../domain/entities/FoodItem';

const mockFrom = jest.fn();
const mockRequireAuthUserId = jest.fn();
const mockStorageFrom = jest.fn();
const mockUpload = jest.fn();
const mockReadFileAsArrayBuffer = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
        storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
    },
}));
jest.mock('../supabase/currentAuthUser', () => ({
    requireAuthUserId: (...args: unknown[]) => mockRequireAuthUserId(...args),
}));
jest.mock('../../infrastructure/supabase/readFileAsArrayBuffer', () => ({
    readFileAsArrayBuffer: (...args: unknown[]) => mockReadFileAsArrayBuffer(...args),
}));

const baseRow = {
    id: 'f1',
    name: 'Oats',
    brand_or_source: 'Generic',
    serving_size_grams: 100,
    calories: 389,
    protein_grams: 17,
    carbs_grams: 66,
    fat_grams: 7,
    ingredients: null,
    raw_ocr_text: null,
    created_at: '2024-01-01T00:00:00.000Z',
};

function buildChain(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.update = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

describe('SupabaseFoodItemRepository', () => {
    let repo: SupabaseFoodItemRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireAuthUserId.mockResolvedValue('user-1');
        mockStorageFrom.mockReturnValue({ upload: (...args: unknown[]) => mockUpload(...args) });
        mockUpload.mockResolvedValue({ error: null });
        mockReadFileAsArrayBuffer.mockResolvedValue(new ArrayBuffer(3));
        repo = new SupabaseFoodItemRepository();
    });

    describe('getFoodItemById()', () => {
        it('returns null when no item matches the id', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getFoodItemById('missing-id');
            expect(result).toBeNull();
        });

        it('returns a mapped FoodItem when a row exists', async () => {
            buildChain({ data: baseRow, error: null });
            const item = await repo.getFoodItemById('f1');
            expect(item).not.toBeNull();
            expect(item!.id).toBe('f1');
            expect(item!.name).toBe('Oats');
            expect(item!.nutrients.find((nutrient) => nutrient.label === 'Calorias')?.values[0].amount).toBe(389);
            expect(item!.availableForPlanning).toBe(true);
        });

        it('maps structured nutrition data without collapsing zero, units, daily values, or unknown values', async () => {
            buildChain({
                data: {
                    ...baseRow,
                    nutrition_data: {
                        columns: [{ id: 'portion', label: 'Porção', basisAmount: 30, basisUnit: 'g' }],
                        nutrients: [{
                            id: 'sodium',
                            label: 'Sódio',
                            values: [{
                                columnId: 'portion', amount: 0, unit: 'mg', dailyValuePercent: 0,
                                certainty: 'confirmed', origin: 'label',
                            }],
                        }, {
                            id: 'vitamin-d',
                            label: 'Vitamina D',
                            values: [{
                                columnId: 'portion', amount: null, unit: null, dailyValuePercent: null,
                                certainty: 'unknown', origin: 'manual',
                            }],
                        }],
                    },
                    available_for_planning: false,
                    original_image_path: 'user-1/f1.jpg',
                },
                error: null,
            });

            const item = await repo.getFoodItemById('f1');

            expect(item!.nutritionColumns[0]).toEqual({
                id: 'portion', label: 'Porção', basisAmount: 30, basisUnit: 'g',
            });
            expect(item!.nutrients[0].values[0]).toMatchObject({
                amount: 0, unit: 'mg', dailyValuePercent: 0, certainty: 'confirmed',
            });
            expect(item!.nutrients[1].values[0]).toMatchObject({
                amount: null, certainty: 'unknown',
            });
            expect(item!.availableForPlanning).toBe(false);
            expect(item!.originalImagePath).toBe('user-1/f1.jpg');
        });

        it('maps nullable legacy macro values as unknown rather than zero', async () => {
            buildChain({
                data: { ...baseRow, calories: null, serving_size_grams: null },
                error: null,
            });

            const item = await repo.getFoodItemById('f1');
            const calories = item!.nutrients.find((nutrient) => nutrient.label === 'Calorias')!.values[0];

            expect(item!.nutritionColumns[0]).toMatchObject({ basisAmount: null, basisUnit: null });
            expect(calories).toMatchObject({
                amount: null, unit: null, certainty: 'unknown',
            });
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'not found' } });
            await expect(repo.getFoodItemById('f1')).rejects.toThrow('Failed to get food item by id: not found');
        });

        it('writes full structured nutrition without lossy legacy unit conversions', async () => {
            const item: FoodItem = {
                id: 'f2',
                name: 'Produto',
                brandOrSource: null,
                nutritionColumns: [{ id: '100g', label: 'Por 100 g', basisAmount: 100, basisUnit: 'g' }],
                nutrients: [
                    { id: 'energy', label: 'Calorias', values: [{
                        columnId: '100g', amount: 150, unit: 'kJ', dailyValuePercent: null,
                        certainty: 'confirmed', origin: 'label',
                    }] },
                    { id: 'protein', label: 'Proteínas', values: [{
                        columnId: '100g', amount: 2, unit: 'mg', dailyValuePercent: null,
                        certainty: 'confirmed', origin: 'label',
                    }] },
                    { id: 'carbs', label: 'Carboidratos', values: [{
                        columnId: '100g', amount: 20, unit: 'g', dailyValuePercent: null,
                        certainty: 'confirmed', origin: 'label',
                    }] },
                ],
                ingredients: null,
                rawOcrText: null,
                originalImagePath: null,
                availableForPlanning: true,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            const chain = buildChain();

            await repo.saveFoodItem(item);

            const row = chain.insert.mock.calls[0][0];
            expect(row).toMatchObject({
                calories: null,
                protein_grams: null,
                carbs_grams: 20,
                serving_size_grams: 100,
                nutrition_data: { columns: item.nutritionColumns, nutrients: item.nutrients },
            });
        });

        it('uploads label images and returns their stored path on save and correction', async () => {
            const item: FoodItem = {
                id: 'image-food',
                name: 'Produto com imagem',
                brandOrSource: null,
                nutritionColumns: [{ id: 'portion', label: 'Porção', basisAmount: null, basisUnit: null }],
                nutrients: [],
                ingredients: null,
                rawOcrText: 'Tabela reconhecida',
                originalImagePath: null,
                availableForPlanning: true,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            const insertChain = buildChain();

            const saved = await repo.saveFoodItem(item, 'file:///label.jpg');

            expect(mockStorageFrom).toHaveBeenCalledWith('food-labels');
            expect(mockReadFileAsArrayBuffer).toHaveBeenCalledWith('file:///label.jpg');
            expect(mockUpload).toHaveBeenCalledWith(
                'user-1/image-food.jpg',
                expect.any(ArrayBuffer),
                { contentType: 'image/jpeg', upsert: true },
            );
            expect(insertChain.insert.mock.calls[0][0].original_image_path).toBe('user-1/image-food.jpg');
            expect(saved.originalImagePath).toBe('user-1/image-food.jpg');

            const updateChain = buildChain({ data: { id: item.id }, error: null });
            const updated = await repo.updateFoodItem(
                { ...saved, name: 'Produto corrigido' },
                'file:///corrected-label.jpg',
            );

            expect(updateChain.update.mock.calls[0][0].original_image_path).toBe('user-1/image-food.jpg');
            expect(mockReadFileAsArrayBuffer).toHaveBeenLastCalledWith('file:///corrected-label.jpg');
            expect(updated.originalImagePath).toBe('user-1/image-food.jpg');
        });
    });
});
