import { SupabaseUserRepository } from '../supabase/SupabaseUserRepository';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const baseRow = {
    id: 'u1',
    name: 'Alice',
    date_of_birth: '1990-05-10',
    height_cm: 165,
    current_weight_kg: 60,
    goal_weight_kg: 55,
    body_fat_percentage: 20,
    protein_percentage: 18,
    objective: 'Lose weight',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
};

function buildChain(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.update = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

describe('SupabaseUserRepository', () => {
    let repo: SupabaseUserRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new SupabaseUserRepository();
    });

    describe('getUser()', () => {
        it('returns null when the table is empty (no 406)', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getUser();
            expect(result).toBeNull();
        });

        it('returns a mapped User when a row exists', async () => {
            buildChain({ data: baseRow, error: null });
            const user = await repo.getUser();
            expect(user).not.toBeNull();
            expect(user!.id).toBe('u1');
            expect(user!.name).toBe('Alice');
            expect(user!.dateOfBirth).toEqual(new Date('1990-05-10'));
            expect(user!.height).toBe(165);
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'db error' } });
            await expect(repo.getUser()).rejects.toThrow('Failed to get user: db error');
        });
    });

    describe('saveUser()', () => {
        it('inserts a row with a valid UUID v4 id', async () => {
            const chain = buildChain();
            const user = {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                name: 'Bob',
                dateOfBirth: new Date(1985, 4, 12), // 12 May 1985, local time
                height: 180,
                currentWeight: 80,
                goalWeight: 70,
                bodyFatPercentage: null,
                proteinPercentage: null,
                objective: 'Get fit',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            await repo.saveUser(user);
            const insertedRow = chain.insert.mock.calls[0][0];
            // id must be the exact UUID passed — not a custom timestamp string
            expect(insertedRow.id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        });

        it('serialises date_of_birth using local date, not UTC, to avoid off-by-one in negative UTC offsets', async () => {
            const chain = buildChain();
            // 12 May 1985 at local midnight — toISOString() would shift this to 11 May in UTC-x zones
            const user = {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                name: 'Bob',
                dateOfBirth: new Date(1985, 4, 12), // May = month index 4
                height: 180,
                currentWeight: 80,
                goalWeight: 70,
                bodyFatPercentage: null,
                proteinPercentage: null,
                objective: 'Get fit',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            await repo.saveUser(user);
            const insertedRow = chain.insert.mock.calls[0][0];
            expect(insertedRow.date_of_birth).toBe('1985-05-12');
        });

        it('throws when Supabase returns an error on insert', async () => {
            const chain = buildChain();
            chain.insert.mockResolvedValue({ error: { message: 'insert error' } });
            const user = {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                name: 'Bob',
                dateOfBirth: new Date(1985, 4, 12),
                height: 180,
                currentWeight: 80,
                goalWeight: 70,
                bodyFatPercentage: null,
                proteinPercentage: null,
                objective: 'Get fit',
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
                updatedAt: new Date('2024-01-01T00:00:00.000Z'),
            };
            await expect(repo.saveUser(user)).rejects.toThrow('Failed to save user: insert error');
        });
    });
});
