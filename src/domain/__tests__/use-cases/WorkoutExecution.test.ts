import { completeSet } from '../../use-cases/workout/CompleteSet';
import { finishWorkoutSession } from '../../use-cases/workout/FinishWorkoutSession';
import { savePartialWorkoutSession } from '../../use-cases/workout/SavePartialWorkoutSession';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';
import { WorkoutSession } from '../../entities/WorkoutSession';
import { Workout } from '../../entities/Workout';

const workout: Workout = { id: 'workout', name: 'Peito', type: 'Weightlifting', exercises: [
    { id: 'press', name: 'Supino', orderIndex: 0, sets: 2, repsPerSet: 10, weightKg: 20, durationSeconds: null, notes: null },
], scheduledAt: null, createdAt: new Date('2026-09-25T10:00:00Z'), updatedAt: new Date('2026-09-25T10:00:00Z') };

function repository() {
    let saved: WorkoutSession = { id: 'session', workoutId: workout.id, startedAt: new Date('2026-09-25T10:00:00Z'), finishedAt: null, sets: [] };
    const repo = { saveWorkoutSession: jest.fn(async (session: WorkoutSession) => { saved = structuredClone(session); }), deleteWorkoutSession: jest.fn(async () => {}) } as unknown as IWorkoutRepository;
    return { repo, current: () => saved };
}

it('records the final set once before allowing the workout to finish', async () => {
    const { repo, current } = repository();
    const first = await completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: 9, weightUsedKg: 17.5, durationSeconds: null });
    await expect(finishWorkoutSession(repo, first, workout)).rejects.toThrow('All sets must be recorded');
    const final = await completeSet(repo, first, workout.exercises[0], 2, { repsCompleted: 8, weightUsedKg: 17.5, durationSeconds: null });
    const finished = await finishWorkoutSession(repo, final, workout);
    expect(finished.sets.map(set => set.setNumber)).toEqual([1, 2]);
    expect(finished.sets[1]).toMatchObject({ repsCompleted: 8, weightUsedKg: 17.5, exerciseName: 'Supino', prescribedReps: 10 });
    expect(current().sets).toHaveLength(2);
    await expect(completeSet(repo, finished, workout.exercises[0], 2, { repsCompleted: 8, weightUsedKg: 17.5, durationSeconds: null })).rejects.toThrow('already recorded');
});

it('allows a one-exercise one-set workout to finish only after that set persists', async () => {
    const { repo, current } = repository();
    const single: Workout = { ...workout, exercises: [{ ...workout.exercises[0], sets: 1 }] };
    await expect(finishWorkoutSession(repo, current(), single)).rejects.toThrow('All sets');
    const recorded = await completeSet(repo, current(), single.exercises[0], 1, { repsCompleted: 10, weightUsedKg: 20, durationSeconds: null });
    const finished = await finishWorkoutSession(repo, recorded, single);
    expect(finished.sets).toHaveLength(1);
    expect(finished.status).toBe('complete');
});

it('records actual HIT duration without invented reps or load', async () => {
    const { repo, current } = repository();
    const hit = { ...workout.exercises[0], sets: 1, repsPerSet: null, weightKg: null, durationSeconds: 1500 };
    const performed = await completeSet(repo, current(), hit, 1, { repsCompleted: 0, weightUsedKg: null, durationSeconds: 1410 });
    expect(performed.sets[0]).toMatchObject({ repsCompleted: 0, weightUsedKg: null, durationSeconds: 1410, prescribedDurationSeconds: 1500 });
});

it('requires actual time for a timed set and rejects invalid performed values', async () => {
    const { repo, current } = repository();
    const timed = { ...workout.exercises[0], durationSeconds: 1200 };
    await expect(completeSet(repo, current(), timed, 1, { repsCompleted: 0, weightUsedKg: null, durationSeconds: null })).rejects.toThrow('Actual duration');
    await expect(completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: -1, weightUsedKg: null, durationSeconds: null })).rejects.toThrow('Reps completed');
    await expect(completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: 10, weightUsedKg: -3, durationSeconds: null })).rejects.toThrow('Weight');
});

it('rejects a timed set with imaginary repetitions or load', async () => {
    const { repo, current } = repository();
    const hit = { ...workout.exercises[0], sets: 1, repsPerSet: null, weightKg: null, durationSeconds: 1500 };
    await expect(completeSet(repo, current(), hit, 1, { repsCompleted: 10, weightUsedKg: null, durationSeconds: 1500 })).rejects.toThrow('Timed set');
    await expect(completeSet(repo, current(), hit, 1, { repsCompleted: 0, weightUsedKg: 20, durationSeconds: 1500 })).rejects.toThrow('Timed set');
});

it('does not advance memory state when saving a set fails, and retry uses the same logical set', async () => {
    const { repo, current } = repository();
    (repo.saveWorkoutSession as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: 9, weightUsedKg: 18, durationSeconds: null })).rejects.toThrow('network');
    expect(current().sets).toHaveLength(0);
    const saved = await completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: 9, weightUsedKg: 18, durationSeconds: null });
    expect(saved.sets).toHaveLength(1);
});

it('does not finish in memory on a failed save and allows a retry with the same set', async () => {
    const { repo, current } = repository();
    const single: Workout = { ...workout, exercises: [{ ...workout.exercises[0], sets: 1 }] };
    const recorded = await completeSet(repo, current(), single.exercises[0], 1, { repsCompleted: 9, weightUsedKg: 20, durationSeconds: null });
    (repo.saveWorkoutSession as jest.Mock).mockRejectedValueOnce(new Error('network'));
    await expect(finishWorkoutSession(repo, recorded, single)).rejects.toThrow('network');
    expect(recorded.finishedAt).toBeNull();
    expect((await finishWorkoutSession(repo, recorded, single)).status).toBe('complete');
});

it('saves recorded work as partial without pretending to complete missing sets', async () => {
    const { repo, current } = repository();
    const first = await completeSet(repo, current(), workout.exercises[0], 1, { repsCompleted: 7, weightUsedKg: 15, durationSeconds: null });
    const partial = await savePartialWorkoutSession(repo, first);
    expect(partial).toMatchObject({ status: 'partial', sets: [{ setNumber: 1, repsCompleted: 7 }] });
    expect(partial.finishedAt).toBeInstanceOf(Date);
    await expect(completeSet(repo, partial, workout.exercises[0], 2, { repsCompleted: 8, weightUsedKg: 15, durationSeconds: null })).rejects.toThrow('already finished');
});

it('can discard an active session without erasing a previously completed workout', async () => {
    const { repo, current } = repository();
    await repo.deleteWorkoutSession(current().id);
    expect(repo.deleteWorkoutSession).toHaveBeenCalledWith('session');
});
