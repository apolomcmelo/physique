import { LocalWorkoutRepository } from '../local/LocalWorkoutRepository';
import { WorkoutSession } from '../../domain/entities/WorkoutSession';

const mockStore = new Map<string, string>();
jest.mock('../local/LocalStorage', () => ({
    getItem: jest.fn(async (key: string) => mockStore.has(key) ? JSON.parse(mockStore.get(key)!) : null),
    setItem: jest.fn(async (key: string, value: unknown) => { mockStore.set(key, JSON.stringify(value)); }),
}));
jest.mock('../local/SavePlanImport', () => ({ getLocalPlan: jest.fn(async () => null) }));

it('reopens partial timed session history and discards only the chosen session', async () => {
    mockStore.clear();
    const repo = new LocalWorkoutRepository();
    const first: WorkoutSession = { id: 'session-1', workoutId: 'workout-1', startedAt: new Date('2026-09-25T10:00:00Z'),
        finishedAt: new Date('2026-09-25T10:15:00Z'), status: 'partial', workoutName: 'HIT', sets: [{
            id: 'set-1', exerciseId: 'exercise-1', exerciseName: 'Treino HIT', setNumber: 1,
            repsCompleted: 0, weightUsedKg: null, durationSeconds: 810, prescribedDurationSeconds: 1500,
            completedAt: new Date('2026-09-25T10:13:30Z'),
        }] };
    await repo.saveWorkoutSession(first);
    await repo.saveWorkoutSession({ ...first, id: 'session-2' });
    const restored = await new LocalWorkoutRepository().getWorkoutSessions();
    expect(restored[0]).toMatchObject({ status: 'partial', workoutName: 'HIT', sets: [{ durationSeconds: 810 }] });
    expect(restored[0].sets[0].completedAt).toBeInstanceOf(Date);
    await repo.deleteWorkoutSession('session-1');
    expect((await repo.getWorkoutSessions()).map(session => session.id)).toEqual(['session-2']);
});
