import { nextRest } from '../../use-cases/workout/WorkoutRest';
import { Exercise } from '../../entities/Workout';

const exercise: Exercise = { id: 'press', name: 'Supino', sets: 2, repsPerSet: 8, durationSeconds: null, weightKg: 20, notes: null };

it('uses 60 seconds by default and the prescription between sets', () => {
    expect(nextRest(exercise, 1, false)).toBe(60);
    expect(nextRest({ ...exercise, restSecondsBetweenSets: 20 }, 1, false)).toBe(20);
    expect(nextRest({ ...exercise, restSecondsBetweenSets: 0 }, 1, false)).toBe(0);
});

it('inherits transition rest unless overridden, including explicit zero', () => {
    expect(nextRest(exercise, 2, false)).toBe(60);
    expect(nextRest({ ...exercise, restSecondsBetweenSets: 20 }, 2, false)).toBe(20);
    expect(nextRest({ ...exercise, restSecondsBetweenSets: 20, restSecondsBeforeNextExercise: 0 }, 2, false)).toBe(0);
    expect(nextRest({ ...exercise, restSecondsBeforeNextExercise: 45 }, 2, false)).toBe(45);
    expect(nextRest(exercise, 2, true)).toBeNull();
});
