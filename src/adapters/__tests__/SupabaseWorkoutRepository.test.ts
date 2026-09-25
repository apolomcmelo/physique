import { SupabaseWorkoutRepository } from '../supabase/SupabaseWorkoutRepository';
import { Workout } from '../../domain/entities/Workout';
import { WorkoutSession } from '../../domain/entities/WorkoutSession';

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: {
        from: (...args: unknown[]) => mockFrom(...args),
        rpc: (...args: unknown[]) => mockRpc(...args),
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
        mockRpc.mockResolvedValue({ error: null });
    });

    describe('getWorkoutById()', () => {
        it('returns null when no workout matches the id', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getWorkoutById('missing-id');
            expect(result).toBeNull();
        });

        it('returns a mapped Workout when a row exists', async () => {
            buildChain({
                data: {
                    ...baseRow,
                    exercises: [{
                        id: 'ex1',
                        workout_id: 'w1',
                        name: 'Bench Press',
                        sets: 4,
                        reps_per_set: 8,
                        weight_kg: 60,
                        duration_seconds: null,
                        notes: 'Keep elbows in',
                        order_index: 0,
                        rest_seconds_between_sets: 90,
                        rest_seconds_before_next_exercise: 120,
                        created_at: '2024-01-01T00:00:00.000Z',
                    }],
                },
                error: null,
            });
            const workout = await repo.getWorkoutById('w1');
            expect(workout).not.toBeNull();
            expect(workout!.id).toBe('w1');
            expect(workout!.name).toBe('Pull Day');
            expect(workout!.type).toBe('Weightlifting');
            expect(workout!.exercises).toHaveLength(1);
            expect(workout!.exercises[0]).toMatchObject({
                name: 'Bench Press',
                orderIndex: 0,
                restSecondsBetweenSets: 90,
                restSecondsBeforeNextExercise: 120,
            });
            expect(workout!.scheduledAt).toBeNull();
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'permission denied' } });
            await expect(repo.getWorkoutById('w1')).rejects.toThrow(
                'Failed to get workout by id: permission denied',
            );
        });
    });

    it('returns performed history with snapshots after the workout is deleted', async () => {
        const chain = buildChain();
        chain.order.mockResolvedValue({ data: [{
            id: 's1', workout_id: 'w1', workout_name: 'Pull Day',
            started_at: '2024-01-01T10:00:00.000Z', finished_at: '2024-01-01T10:20:00.000Z',
            completed_sets: [{ id: 'set1', session_id: 's1', exercise_id: 'ex1', exercise_name: 'Bench Press',
                prescribed_reps: 8, prescribed_weight_kg: 60, prescribed_duration_seconds: null,
                set_number: 1, reps_completed: 9, weight_used_kg: 55, completed_at: '2024-01-01T10:05:00.000Z' }],
        }], error: null });
        const history = await repo.getWorkoutSessions();
        expect(history[0].workoutName).toBe('Pull Day');
        expect(history[0].sets[0]).toMatchObject({ exerciseName: 'Bench Press', prescribedReps: 8,
            prescribedWeightKg: 60, repsCompleted: 9, weightUsedKg: 55 });
    });

    describe('saveWorkout()', () => {
        it('does not leave a parent workout when an exercise write fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'invalid exercise' } });
            await expect(repo.saveWorkout({ ...baseWorkout, exercises: [{
                id: 'ex1', name: 'Press', sets: 2, repsPerSet: 5,
                weightKg: null, durationSeconds: null, notes: null,
            }] })).rejects.toThrow('invalid exercise');
            expect(mockRpc).toHaveBeenCalledWith('create_workout_atomically', expect.objectContaining({
                p_exercises: [expect.objectContaining({ id: 'ex1' })],
            }));
            expect(mockFrom).not.toHaveBeenCalled();
        });
        it('creates the workout with the authenticated user_id', async () => {
            buildChain();
            await repo.saveWorkout(baseWorkout);
            expect(mockRpc).toHaveBeenCalledWith('create_workout_atomically', expect.objectContaining({
                p_workout: expect.objectContaining({ id: 'w1', name: 'Pull Day', user_id: 'auth-user-1' }),
            }));
        });

        it('throws when the atomic create fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'row-level security' } });
            await expect(repo.saveWorkout(baseWorkout)).rejects.toThrow(
                'Failed to save workout: row-level security',
            );
        });
    });

    describe('updateWorkout()', () => {
        it('keeps the previous workout and its exercises intact if replacement fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'exercise constraint failed' } });
            await expect(repo.updateWorkout({ ...baseWorkout, exercises: [{
                id: 'ex1', name: 'Squat', sets: 3, repsPerSet: 5, weightKg: 10,
                durationSeconds: null, notes: null,
            }] })).rejects.toThrow('exercise constraint failed');
            expect(mockRpc).toHaveBeenCalledWith('save_workout_atomically', expect.objectContaining({
                p_workout: expect.objectContaining({ id: 'w1' }),
                p_exercises: [expect.objectContaining({ id: 'ex1', workout_id: 'w1' })],
            }));
            expect(mockFrom).not.toHaveBeenCalled();
        });
        it('updates the workout and exercises in one database call', async () => {
            buildChain();
            await repo.updateWorkout(baseWorkout);
            expect(mockRpc).toHaveBeenCalledWith('save_workout_atomically', expect.objectContaining({
                p_workout: expect.objectContaining({ id: 'w1', user_id: 'auth-user-1' }),
                p_exercises: [],
            }));
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('throws when the atomic write fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'conflict' } });
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

    describe('saveWorkoutSession()', () => {
        const baseSession: WorkoutSession = {
            id: 's1',
            workoutId: 'w1',
            startedAt: new Date('2024-01-01T10:00:00.000Z'),
            finishedAt: null,
            sets: [],
        };

        it('does not mark a session finished if saving its completed sets fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'set rejected' } });
            await expect(repo.saveWorkoutSession({ ...baseSession, finishedAt: new Date(), sets: [{
                id: 'set1', exerciseId: 'ex1', setNumber: 1, repsCompleted: 10,
                weightUsedKg: null, completedAt: new Date(),
            }] })).rejects.toThrow('set rejected');
            expect(mockRpc).toHaveBeenCalledWith('save_session_atomically', expect.objectContaining({
                p_sets: [expect.objectContaining({ id: 'set1' })],
            }));
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('upserts the session so repeated calls with the same id do not conflict', async () => {
            buildChain();
            await repo.saveWorkoutSession(baseSession);
            await repo.saveWorkoutSession(baseSession);
            expect(mockRpc).toHaveBeenCalledWith('save_session_atomically', expect.objectContaining({
                p_session: expect.objectContaining({ id: 's1', user_id: 'auth-user-1' }),
            }));
        });

        it('upserts completed sets appended across successive calls', async () => {
            buildChain();
            const withOneSet: WorkoutSession = {
                ...baseSession,
                sets: [
                    {
                        id: 'set1',
                        exerciseId: 'ex1',
                        setNumber: 1,
                        repsCompleted: 10,
                        weightUsedKg: 20,
                        completedAt: new Date('2024-01-01T10:05:00.000Z'),
                    },
                ],
            };
            await repo.saveWorkoutSession(withOneSet);
            expect(mockRpc).toHaveBeenCalledWith('save_session_atomically', expect.objectContaining({
                p_sets: [expect.objectContaining({ id: 'set1' })],
            }));
        });

        it('throws when the session upsert fails', async () => {
            mockRpc.mockResolvedValue({ error: { message: 'conflict' } });
            await expect(repo.saveWorkoutSession(baseSession)).rejects.toThrow(
                'Failed to save workout session: conflict',
            );
        });
    });
});
