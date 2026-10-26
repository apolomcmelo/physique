import { calculateWeightGoalProgress, createWeightGoal, selectWeightBaseline, selectWeightGoal } from '../../entities/WeightGoal';

const goal = createWeightGoal({
    userId: 'user-1',
    targetWeightKg: 70,
    startedAt: new Date('2026-01-10T00:00:00.000Z'),
});

describe('WeightGoal', () => {
    it('selects the latest goal that has started', () => {
        const future = createWeightGoal({
            userId: 'user-1',
            targetWeightKg: 65,
            startedAt: new Date('2026-02-01T00:00:00.000Z'),
        });
        expect(selectWeightGoal([goal, future], new Date('2026-01-31T23:59:59.999Z'))).toEqual(goal);
        expect(selectWeightGoal([goal, future], new Date('2026-02-01T00:00:00.000Z'))).toEqual(future);
    });

    it('keeps progress unavailable without a historical baseline or current measurement', () => {
        expect(calculateWeightGoalProgress(75, goal, null)).toBeNull();
        expect(calculateWeightGoalProgress(null, goal, 80)).toBeNull();
    });

    it('uses the latest weight measurement at or before the goal start, excluding later readings', () => {
        const older = { id: 'older', userId: 'user-1', weightKg: 82, bodyFatPercentage: null,
            proteinPercentage: null, recordedAt: new Date('2026-01-01T00:00:00.000Z') };
        const baseline = { ...older, id: 'baseline', weightKg: 80, recordedAt: new Date('2026-01-10T00:00:00.000Z') };
        const later = { ...older, id: 'later', weightKg: 75, recordedAt: new Date('2026-01-11T00:00:00.000Z') };
        expect(selectWeightBaseline([older, later, baseline], goal)?.id).toBe('baseline');
        expect(selectWeightBaseline([later], goal)).toBeNull();
    });

    it('calculates progress toward a lower target from a dated baseline', () => {
        expect(calculateWeightGoalProgress(75, goal, 80)).toEqual({
            currentWeightKg: 75,
            targetWeightKg: 70,
            baselineWeightKg: 80,
            remainingWeightKg: 5,
            progress: 0.5,
        });
    });

    it('calculates progress toward a higher target and clamps completed goals', () => {
        const gainGoal = createWeightGoal({
            userId: 'user-1',
            targetWeightKg: 90,
            startedAt: new Date('2026-01-10T00:00:00.000Z'),
        });
        expect(calculateWeightGoalProgress(85, gainGoal, 80)?.progress).toBe(0.5);
        expect(calculateWeightGoalProgress(95, gainGoal, 80)?.progress).toBe(1);
    });

    it('rejects invalid goal weights and dates', () => {
        expect(() => createWeightGoal({ ...goal, targetWeightKg: 0 })).toThrow('Goal weight must be greater than 0');
        expect(() => createWeightGoal({ ...goal, startedAt: new Date('invalid') })).toThrow('Goal start date must be valid');
    });
});
