import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalMealPlanRepository } from '../local/LocalMealPlanRepository';
import { LocalWorkoutRepository } from '../local/LocalWorkoutRepository';
import { saveLocalPlanImport } from '../local/SavePlanImport';
import { MealPlanEntry } from '../../domain/entities/MealPlan';
import { Workout } from '../../domain/entities/Workout';

let mockUserId: string | null = 'account-a';
const mockFiles = new Map<string, string>();
let mockFailNextWrite = false;
let mockSwitchAccountAfterRead = false;
let mockLoseAcknowledgement = false;
let mockPauseWrite: (() => void) | null = null;
let mockContinueWrite: Promise<void> | null = null;
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: mockUserId ? { id: mockUserId } : null }, error: null }) } },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async (key: string) => {
        const value = mockFiles.get(key) ?? null;
        if (mockSwitchAccountAfterRead && key === '@physique/combined_plan/account-a') {
            mockSwitchAccountAfterRead = false;
            mockUserId = 'account-b';
        }
        return value;
    }),
    setItem: jest.fn(async (key: string, value: string) => {
        if (mockPauseWrite && mockContinueWrite) {
            mockPauseWrite();
            await mockContinueWrite;
        }
        if (mockFailNextWrite) { mockFailNextWrite = false; throw new Error('quota exceeded'); }
        mockFiles.set(key, value);
        if (mockLoseAcknowledgement) { mockLoseAcknowledgement = false; throw new Error('acknowledgement lost'); }
    }),
}));

const meal: MealPlanEntry = { id: 'meal-new', day: 'Segunda-feira', time: '08:00', activity: 'Café', description: 'Ovos', biologicalObjective: 'Energia' };
const workout: Workout = { id: 'workout-new', name: 'Treino novo', type: 'HIT', scheduledAt: null, exercises: [], createdAt: new Date('2026-09-25T08:00:00Z'), updatedAt: new Date('2026-09-25T08:00:00Z') };
const meals = new LocalMealPlanRepository();
const workouts = new LocalWorkoutRepository();

describe('local combined plan import', () => {
    beforeEach(() => { mockUserId = 'account-a'; mockFiles.clear(); mockFailNextWrite = false; mockSwitchAccountAfterRead = false; mockLoseAcknowledgement = false; mockPauseWrite = null; mockContinueWrite = null; jest.clearAllMocks(); });

    it('leaves both prior views untouched if the single durable write fails', async () => {
        await meals.saveMealPlanEntries([{ ...meal, id: 'old-meal' }]);
        await workouts.saveWorkout({ ...workout, id: 'old-workout' });
        mockFailNextWrite = true;
        await expect(saveLocalPlanImport([meal], [workout], 'csv-v1')).rejects.toThrow('quota exceeded');
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['old-meal']);
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['old-workout']);
    });

    it('commits both views in one write and ignores retries, including after a new repository instance', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((await new LocalMealPlanRepository().getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new']);
        expect((await new LocalWorkoutRepository().getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
        expect((await workouts.getWorkouts())[0].createdAt).toBeInstanceOf(Date);
        const writes = (AsyncStorage.setItem as jest.Mock).mock.calls.length;
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((AsyncStorage.setItem as jest.Mock).mock.calls).toHaveLength(writes);
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
    });

    it('does not duplicate work when a storage write succeeds but its acknowledgement is lost', async () => {
        mockLoseAcknowledgement = true;
        await expect(saveLocalPlanImport([meal], [workout], 'csv-v1')).rejects.toThrow('acknowledgement lost');
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((await new LocalMealPlanRepository().getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new']);
        expect((await new LocalWorkoutRepository().getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
        expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it('preserves existing workouts on the first combined import and a retry cannot overwrite later edits', async () => {
        await meals.saveMealPlanEntries([{ ...meal, id: 'old-meal' }]);
        await workouts.saveWorkout({ ...workout, id: 'old-workout' });
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['old-workout', 'workout-new']);
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['old-meal', 'meal-new']);
        await workouts.updateWorkout({ ...workout, name: 'Edited later' });
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((await new LocalWorkoutRepository().getWorkouts()).find(w => w.id === workout.id)?.name).toBe('Edited later');
    });

    it('keeps prior imported meals and workouts when importing another CSV', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        await saveLocalPlanImport([{ ...meal, id: 'meal-next' }], [{ ...workout, id: 'workout-next' }], 'csv-v2');
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new', 'meal-next']);
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new', 'workout-next']);
    });

    it('keeps meal edits and workout deletes visible after the combined import', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        await meals.saveMealPlanEntries([{ ...meal, description: 'Banana' }]);
        expect((await new LocalMealPlanRepository().getMealPlanEntries())[0].description).toBe('Banana');
        await workouts.deleteWorkout(workout.id);
        expect(await new LocalWorkoutRepository().getWorkouts()).toEqual([]);
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect(await workouts.getWorkouts()).toEqual([]);
    });

    it('keeps different accounts separate and refuses unauthenticated imports', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        mockUserId = 'account-b';
        expect(await meals.getMealPlanEntries()).toEqual([]);
        expect(await workouts.getWorkouts()).toEqual([]);
        await saveLocalPlanImport([{ ...meal, id: 'b-meal' }], [], 'csv-v1');
        mockUserId = 'account-a';
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new']);
        mockUserId = null;
        await expect(saveLocalPlanImport([meal], [workout], 'csv-v1')).rejects.toThrow('No authenticated user');
    });

    it('allows a later import after a failed write rather than retaining a failed lock', async () => {
        mockFailNextWrite = true;
        await expect(saveLocalPlanImport([meal], [workout], 'csv-v1')).rejects.toThrow('quota exceeded');
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
    });

    it('retains the previous combined snapshot if replacing it exceeds the storage quota', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        mockFailNextWrite = true;
        await expect(saveLocalPlanImport([{ ...meal, id: 'meal-next' }], [], 'csv-v2')).rejects.toThrow('quota exceeded');
        expect((await new LocalMealPlanRepository().getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new']);
        expect((await new LocalWorkoutRepository().getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
        await saveLocalPlanImport([{ ...meal, id: 'meal-next' }], [], 'csv-v2');
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new', 'meal-next']);
    });

    it('does not expose older single-key records when switching accounts after an import', async () => {
        mockFiles.set('@physique/meal_plan', JSON.stringify([{ ...meal, id: 'unscoped' }]));
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        mockUserId = 'account-b';
        expect(await meals.getMealPlanEntries()).toEqual([]);
        expect(await workouts.getWorkouts()).toEqual([]);
    });

    it('does not write account A data into account B if the signed-in user changes before the write', async () => {
        mockSwitchAccountAfterRead = true;
        await expect(saveLocalPlanImport([meal], [workout], 'csv-v1')).rejects.toThrow('Account changed');
        expect(mockFiles.has('@physique/combined_plan/account-b')).toBe(false);
        mockUserId = 'account-a';
        expect(await meals.getMealPlanEntries()).toEqual([]);
    });

    it('never displays account A data in account B while a write is paused', async () => {
        let releaseWrite = () => {};
        mockContinueWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
        const started = new Promise<void>((resolve) => { mockPauseWrite = resolve; });
        const pending = saveLocalPlanImport([meal], [workout], 'csv-v1');
        await started;
        mockUserId = 'account-b';
        expect(await meals.getMealPlanEntries()).toEqual([]);
        releaseWrite();
        await pending;
        expect(await workouts.getWorkouts()).toEqual([]);
        mockUserId = 'account-a';
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
    });

    it('retains an account-scoped import after sign-out during a pending write', async () => {
        let releaseWrite = () => {};
        mockContinueWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
        const started = new Promise<void>((resolve) => { mockPauseWrite = resolve; });
        const pending = saveLocalPlanImport([meal], [workout], 'csv-v1');
        await started;
        mockUserId = null;
        releaseWrite();
        await pending;
        expect(mockFiles.has('@physique/combined_plan/account-a')).toBe(true);
        await expect(meals.getMealPlanEntries()).rejects.toThrow('No authenticated user');
        mockUserId = 'account-a';
        expect((await meals.getMealPlanEntries()).map(m => m.id)).toEqual(['meal-new']);
    });

    it('serializes simultaneous retries so only one snapshot is written', async () => {
        let releaseWrite = () => {};
        mockContinueWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
        const writeStarted = new Promise<void>((resolve) => { mockPauseWrite = resolve; });
        const first = saveLocalPlanImport([meal], [workout], 'csv-v1');
        await writeStarted;
        const second = saveLocalPlanImport([meal], [workout], 'csv-v1');
        releaseWrite();
        await Promise.all([first, second]);
        expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
        expect((await workouts.getWorkouts()).map(w => w.id)).toEqual(['workout-new']);
    });

    it('does not overwrite a workout edit made while an import is in flight', async () => {
        await saveLocalPlanImport([], [{ ...workout, id: 'old-workout' }], 'older-csv');
        let releaseWrite = () => {};
        mockContinueWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
        const writeStarted = new Promise<void>((resolve) => { mockPauseWrite = resolve; });
        const importing = saveLocalPlanImport([meal], [workout], 'csv-v1');
        await writeStarted;
        const editing = workouts.updateWorkout({ ...workout, id: 'old-workout', name: 'Edited while importing' });
        releaseWrite();
        await Promise.all([importing, editing]);
        expect((await workouts.getWorkouts()).find(w => w.id === 'old-workout')?.name).toBe('Edited while importing');
    });

    it('does not overwrite meal edits made while an import is in flight', async () => {
        await saveLocalPlanImport([meal], [], 'older-csv');
        let releaseWrite = () => {};
        mockContinueWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
        const started = new Promise<void>((resolve) => { mockPauseWrite = resolve; });
        const importing = saveLocalPlanImport([meal], [workout], 'csv-v1');
        await started;
        const editing = meals.saveMealPlanEntries([{ ...meal, description: 'Banana' }]);
        releaseWrite();
        await Promise.all([importing, editing]);
        expect((await meals.getMealPlanEntries())[0].description).toBe('Banana');
    });

    it('keeps session history after deleting an imported workout', async () => {
        await saveLocalPlanImport([meal], [workout], 'csv-v1');
        await workouts.saveWorkoutSession({
            id: 'session-1', workoutId: workout.id, startedAt: new Date('2026-09-25T08:00:00Z'),
            finishedAt: new Date('2026-09-25T08:15:00Z'), sets: [],
        });
        await workouts.deleteWorkout(workout.id);
        expect((await workouts.getWorkoutSessions(workout.id)).map(s => s.id)).toEqual(['session-1']);
    });
});
