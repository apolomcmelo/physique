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
    chain.not = jest.fn().mockReturnValue(chain);
    chain.update = jest.fn().mockReturnValue(chain);
    chain.delete = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.eq = jest.fn().mockReturnValue(chain);
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

        it('updates and deletes only the selected owner record', async () => {
            const chain = buildChain({ data: { id: 'w1' }, error: null });
            const record = {
                id: 'w1',
                userId: 'u1',
                weightKg: null,
                bodyFatPercentage: 18.5,
                proteinPercentage: null,
                recordedAt: new Date('2026-10-25T08:00:00.000Z'),
            };
            await repo.updateWeightRecord(record);
            expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
                id: 'w1',
                weight_kg: null,
                body_fat_percentage: 18.5,
            }));
            expect(chain.eq).toHaveBeenCalledWith('id', 'w1');
            expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');

            await repo.deleteWeightRecord('w1');
            expect(chain.delete).toHaveBeenCalled();
            expect(chain.eq).toHaveBeenCalledWith('id', 'w1');
        });

        it('reports when an update or delete affects no owner-visible record', async () => {
            buildChain({ data: null, error: null });
            const record = {
                id: 'missing',
                userId: 'u1',
                weightKg: 80,
                bodyFatPercentage: null,
                proteinPercentage: null,
                recordedAt: new Date('2026-10-25T08:00:00.000Z'),
            };
            await expect(repo.updateWeightRecord(record)).rejects.toThrow('record not found or not owned');

            buildChain({ data: null, error: null });
            await expect(repo.deleteWeightRecord('missing')).rejects.toThrow('record not found or not owned');
        });
    });
});
