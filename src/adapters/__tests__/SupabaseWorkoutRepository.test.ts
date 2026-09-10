import { SupabaseWorkoutRepository } from '../supabase/SupabaseWorkoutRepository';
import { Workout } from '../../domain/entities/Workout';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null }),
        },
    },
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
    chain.upsert = jest.fn().mockResolvedValue({ error: null });
    chain.delete = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

const baseWorkout: Workout = {
    id: 'w1',
    name: 'Pull Day',
    type: 'Weightlifting',
    exercises: [],
    scheduledAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

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

    describe('saveWorkout()', () => {
        it('inserts the workout with the authenticated user_id', async () => {
            const chain = buildChain();
            await repo.saveWorkout(baseWorkout);
            expect(mockFrom).toHaveBeenCalledWith('workouts');
            expect(chain.insert).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'w1', name: 'Pull Day', user_id: 'auth-user-1' }),
            );
        });

        it('throws when the insert fails', async () => {
            const chain = buildChain();
            chain.insert.mockResolvedValue({ error: { message: 'row-level security' } });
            await expect(repo.saveWorkout(baseWorkout)).rejects.toThrow(
                'Failed to save workout: row-level security',
            );
        });
    });

    describe('updateWorkout()', () => {
        it('upserts the workout and replaces its exercises', async () => {
            const chain = buildChain();
            await repo.updateWorkout(baseWorkout);
            expect(mockFrom).toHaveBeenCalledWith('workouts');
            expect(chain.upsert).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'w1', user_id: 'auth-user-1' }),
            );
            expect(mockFrom).toHaveBeenCalledWith('exercises');
            expect(chain.delete).toHaveBeenCalled();
            expect(chain.eq).toHaveBeenCalledWith('workout_id', 'w1');
        });

        it('throws when the upsert fails', async () => {
            const chain = buildChain();
            chain.upsert.mockResolvedValue({ error: { message: 'conflict' } });
            await expect(repo.updateWorkout(baseWorkout)).rejects.toThrow(
                'Failed to update workout: conflict',
            );
        });
    });

    describe('deleteWorkout()', () => {
        it('deletes the workout by id', async () => {
            const chain = buildChain();
            await repo.deleteWorkout('w1');
            expect(mockFrom).toHaveBeenCalledWith('workouts');
            expect(chain.delete).toHaveBeenCalled();
            expect(chain.eq).toHaveBeenCalledWith('id', 'w1');
        });

        it('throws when the delete fails', async () => {
            const chain = buildChain();
            chain.eq.mockResolvedValue({ error: { message: 'not allowed' } });
            await expect(repo.deleteWorkout('w1')).rejects.toThrow(
                'Failed to delete workout: not allowed',
            );
        });
    });
});
