import { SupabaseWorkoutRepository } from '../supabase/SupabaseWorkoutRepository';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const baseRow = {
    id: 'w1',
    name: 'Pull Day',
    type: 'Weightlifting',
    scheduled_at: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    exercises: [],
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

describe('SupabaseWorkoutRepository', () => {
    let repo: SupabaseWorkoutRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new SupabaseWorkoutRepository();
    });

    describe('getWorkoutById()', () => {
        it('returns null when no workout matches the id', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getWorkoutById('missing-id');
            expect(result).toBeNull();
        });

        it('returns a mapped Workout when a row exists', async () => {
            buildChain({ data: baseRow, error: null });
            const workout = await repo.getWorkoutById('w1');
            expect(workout).not.toBeNull();
            expect(workout!.id).toBe('w1');
            expect(workout!.name).toBe('Pull Day');
            expect(workout!.type).toBe('Weightlifting');
            expect(workout!.exercises).toEqual([]);
            expect(workout!.scheduledAt).toBeNull();
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'permission denied' } });
            await expect(repo.getWorkoutById('w1')).rejects.toThrow(
                'Failed to get workout by id: permission denied',
            );
        });
    });
});
