import { SupabaseWeightRepository } from '../supabase/SupabaseWeightRepository';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const baseRow = {
    id: 'w1',
    user_id: 'u1',
    weight_kg: 80.5,
    body_fat_percentage: 18,
    protein_percentage: null,
    recorded_at: '2024-06-01T08:00:00.000Z',
    created_at: '2024-06-01T08:00:00.000Z',
};

function buildChain(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

describe('SupabaseWeightRepository', () => {
    let repo: SupabaseWeightRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new SupabaseWeightRepository();
    });

    describe('getLatestWeight()', () => {
        it('returns null when no weight records exist', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getLatestWeight();
            expect(result).toBeNull();
        });

        it('returns a mapped WeightRecord when a row exists', async () => {
            buildChain({ data: baseRow, error: null });
            const record = await repo.getLatestWeight();
            expect(record).not.toBeNull();
            expect(record!.id).toBe('w1');
            expect(record!.weightKg).toBe(80.5);
            expect(record!.bodyFatPercentage).toBe(18);
            expect(record!.proteinPercentage).toBeNull();
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'timeout' } });
            await expect(repo.getLatestWeight()).rejects.toThrow('Failed to get latest weight: timeout');
        });
    });
});
