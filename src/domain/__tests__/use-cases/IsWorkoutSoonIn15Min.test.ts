import { isWorkoutSoonIn15Min } from '../../use-cases/workout/IsWorkoutSoonIn15Min';
import { Workout } from '../../entities/Workout';

function makeWorkout(scheduledAt: Date | null): Workout {
    return {
        id: 'workout-1',
        name: 'Test Workout',
        type: 'Weightlifting',
        exercises: [],
        scheduledAt,
        createdAt: new Date(2024, 0, 1),
        updatedAt: new Date(2024, 0, 1),
    };
}

describe('isWorkoutSoonIn15Min', () => {
    const now = new Date(2024, 0, 1, 8, 0);

    it('returns true if workout is scheduled 10 minutes from now', () => {
        const scheduledAt = new Date(now.getTime() + 10 * 60 * 1000);
        const workout = makeWorkout(scheduledAt);
        expect(isWorkoutSoonIn15Min(workout, now)).toBe(true);
    });

    it('returns true if workout is scheduled exactly 15 minutes from now', () => {
        const scheduledAt = new Date(now.getTime() + 15 * 60 * 1000);
        const workout = makeWorkout(scheduledAt);
        expect(isWorkoutSoonIn15Min(workout, now)).toBe(true);
    });

    it('returns false if workout is scheduled 16 minutes from now', () => {
        const scheduledAt = new Date(now.getTime() + 16 * 60 * 1000);
        const workout = makeWorkout(scheduledAt);
        expect(isWorkoutSoonIn15Min(workout, now)).toBe(false);
    });

    it('returns false if workout is null', () => {
        expect(isWorkoutSoonIn15Min(null, now)).toBe(false);
    });

    it('returns false if workout has no scheduledAt', () => {
        const workout = makeWorkout(null);
        expect(isWorkoutSoonIn15Min(workout, now)).toBe(false);
    });
});
