import { Workout } from '../../entities/Workout';
import { IWorkoutRepository } from '../../ports/WorkoutRepository';
import { getNextScheduledWorkout, getNextWorkout } from '../../use-cases/workout/GetNextWorkout';

function makeWorkout(id: string, scheduledAt: Date): Workout {
    return {
        id,
        name: id,
        type: 'Calisthenics',
        exercises: [],
        scheduledAt,
        createdAt: scheduledAt,
        updatedAt: scheduledAt,
    };
}

function repository(workouts: Workout[]): IWorkoutRepository {
    return { getWorkouts: async () => workouts } as IWorkoutRepository;
}

describe('getNextWorkout', () => {
    const now = new Date('2026-09-12T10:00:00.000Z');

    it('includes workouts scheduled within the previous or next hour', async () => {
        const workouts = [
            makeWorkout('next', new Date('2026-09-12T11:00:00.000Z')),
            makeWorkout('grace', new Date('2026-09-12T09:00:00.000Z')),
        ];

        await expect(getNextWorkout(repository(workouts), now)).resolves.toMatchObject({ id: 'grace' });
    });

    it('returns null outside the 60-minute window', async () => {
        const workouts = [
            makeWorkout('before', new Date('2026-09-12T08:59:59.999Z')),
            makeWorkout('after', new Date('2026-09-12T11:00:00.001Z')),
        ];

        await expect(getNextWorkout(repository(workouts), now)).resolves.toBeNull();
    });

    it('finds the next future workout for fallback display', async () => {
        const workouts = [
            makeWorkout('far', new Date('2026-09-13T10:00:00.000Z')),
            makeWorkout('near', new Date('2026-09-12T11:00:00.000Z')),
        ];

        await expect(getNextScheduledWorkout(repository(workouts), now)).resolves.toMatchObject({ id: 'near' });
    });
});