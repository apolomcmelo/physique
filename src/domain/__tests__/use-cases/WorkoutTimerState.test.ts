import { resumedTimedSet } from '../../use-cases/workout/WorkoutTimerState';

it('derives actual time and remaining rest from the timed set expiry, not the late callback', () => {
    const startedAt = new Date('2026-09-25T10:00:00Z').getTime();
    const now = new Date('2026-09-25T10:01:15Z').getTime();
    expect(resumedTimedSet(startedAt, 45, 60, now)).toEqual({
        actualDurationSeconds: 45,
        restDeadline: startedAt + 105000,
        remainingRestSeconds: 30,
    });
});

it('leaves rest expired without starting any later set', () => {
    const startedAt = new Date('2026-09-25T10:00:00Z').getTime();
    expect(resumedTimedSet(startedAt, 45, 60, startedAt + 120000)).toMatchObject({ remainingRestSeconds: 0 });
});
