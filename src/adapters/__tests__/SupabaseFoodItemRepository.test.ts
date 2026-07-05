import { SupabaseFoodItemRepository } from '../supabase/SupabaseFoodItemRepository';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
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
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

describe('SupabaseFoodItemRepository', () => {
    let repo: SupabaseFoodItemRepository;

    beforeEach(() => {
        jest.clearAllMocks();
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
            expect(item!.calories).toBe(389);
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'not found' } });
            await expect(repo.getFoodItemById('f1')).rejects.toThrow('Failed to get food item by id: not found');
        });
    });
});
