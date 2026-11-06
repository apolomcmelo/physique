import { Exercise } from '../../../domain/entities/Workout';
import {
    exerciseQueueStatus,
    formatClock,
    formatElapsed,
    queueDetail,
    sessionProgress,
    setTarget,
} from '../sessionProgress';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
    id: 'e', name: 'Supino', sets: 4, repsPerSet: 10, weightKg: 36, durationSeconds: null,
    notes: null, orderIndex: 0, ...overrides,
} as Exercise);

describe('sessionProgress', () => {
    it('counts recorded sets against the prescribed total', () => {
        const result = sessionProgress([exercise({ sets: 4 }), exercise({ sets: 2 })], 3);
        expect(result).toEqual({ totalSets: 6, doneSets: 3, currentSet: 4, percent: 50 });
    });

    it('caps the current set at the total and reaches 100% when done', () => {
        expect(sessionProgress([exercise({ sets: 2 })], 2)).toEqual({ totalSets: 2, doneSets: 2, currentSet: 2, percent: 100 });
    });

    it('treats exercises without sets as a single set and empty workouts as 0%', () => {
        expect(sessionProgress([exercise({ sets: null })], 0).totalSets).toBe(1);
        expect(sessionProgress([], 0)).toEqual({ totalSets: 0, doneSets: 0, currentSet: 0, percent: 0 });
    });
});

describe('exerciseQueueStatus', () => {
    it('marks earlier exercises done, the current one active and the following ones next/pending', () => {
        const status = (index: number) => exerciseQueueStatus(index, 1, false);
        expect([0, 1, 2, 3].map(status)).toEqual(['done', 'current', 'next', 'pending']);
    });

    it('marks the last exercise done once the final set is recorded', () => {
        expect(exerciseQueueStatus(2, 2, true)).toBe('done');
    });
});

describe('formatting', () => {
    it('formats elapsed time as mm:ss and h:mm:ss', () => {
        expect(formatElapsed(0)).toBe('00:00');
        expect(formatElapsed(38 * 60_000 + 15_000)).toBe('38:15');
        expect(formatElapsed(3_725_000)).toBe('1:02:05');
        expect(formatElapsed(-5000)).toBe('00:00');
    });

    it('formats a countdown clock', () => {
        expect(formatClock(75)).toBe('01:15');
        expect(formatClock(0)).toBe('00:00');
    });

    it('describes the set target for reps, load and timed exercises', () => {
        expect(setTarget(exercise())).toBe('10 reps com 36 kg');
        expect(setTarget(exercise({ weightKg: null }))).toBe('10 reps');
        expect(setTarget(exercise({ repsPerSet: null, durationSeconds: 45, weightKg: null }))).toBe('45s');
        expect(setTarget(exercise({ repsPerSet: null, durationSeconds: 90, weightKg: 5 }))).toBe('1:30min com 5 kg');
    });

    it('describes queue rows by state', () => {
        expect(queueDetail(exercise({ sets: 3 }), 'pending')).toBe('3x 10 reps • 36 kg');
        expect(queueDetail(exercise({ sets: 3, weightKg: null }), 'next')).toBe('3x 10 reps');
        expect(queueDetail(exercise({ sets: 4 }), 'done')).toBe('4 séries concluídas');
    });
});
