import { Exercise, Workout } from '../../../domain/entities/Workout';
import { estimateDurationMinutes, exerciseDetail, matchesSearch, totalSets, weekdayLabel } from '../workoutSummary';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
    id: 'e', name: 'Supino', sets: 3, repsPerSet: 10, weightKg: null, durationSeconds: null, notes: null,
    ...overrides,
});
const workout = (exercises: Exercise[], name = 'Treino A'): Workout => ({
    id: 'w', name, type: 'Weightlifting', exercises, scheduledAt: null,
    createdAt: new Date(2026, 0, 1), updatedAt: new Date(2026, 0, 1),
});

describe('totalSets', () => {
    it('sums sets, counting an exercise without sets as one', () => {
        expect(totalSets(workout([exercise({ sets: 4 }), exercise({ sets: null }), exercise({ sets: 3 })]))).toBe(8);
    });
});

describe('estimateDurationMinutes', () => {
    it('is null when there are no exercises', () => {
        expect(estimateDurationMinutes(workout([]))).toBeNull();
    });

    it('adds set time and rests, rounding up to whole minutes', () => {
        const ex = exercise({
            sets: 3, repsPerSet: 10, durationSeconds: null,
            restSecondsBetweenSets: 60, restSecondsBeforeNextExercise: 90,
        });
        // 3 sets x 30s + 2 rests x 60s = 210s; no rest after the last exercise
        expect(estimateDurationMinutes(workout([ex]))).toBe(4);
        // two exercises: 210 + 90 + 210 = 510s
        expect(estimateDurationMinutes(workout([ex, ex]))).toBe(9);
    });

    it('uses the per-set duration for timed sets', () => {
        const plank = exercise({
            sets: 2, repsPerSet: null, durationSeconds: 45,
            restSecondsBetweenSets: 30, restSecondsBeforeNextExercise: 0,
        });
        // 2 x 45s + 1 x 30s = 120s
        expect(estimateDurationMinutes(workout([plank]))).toBe(2);
    });

    it('falls back to a default rest when none is set', () => {
        const ex = exercise({ sets: 2, repsPerSet: 10 });
        // 2 x 30s + 1 x 60s default rest = 120s
        expect(estimateDurationMinutes(workout([ex]))).toBe(2);
    });
});

describe('exerciseDetail', () => {
    it('shows sets x reps with the load', () => {
        expect(exerciseDetail(exercise({ sets: 4, repsPerSet: 10, weightKg: 32.5 }))).toBe('4x 10 • 32,5 kg');
    });

    it('shows sets x seconds for timed sets', () => {
        expect(exerciseDetail(exercise({ sets: 3, repsPerSet: null, durationSeconds: 45 }))).toBe('3x 45s');
    });

    it('shows only the load when there is no volume', () => {
        expect(exerciseDetail(exercise({ sets: null, repsPerSet: null, weightKg: 20 }))).toBe('20 kg');
    });

    it('is empty when nothing is prescribed', () => {
        expect(exerciseDetail(exercise({ sets: null, repsPerSet: null }))).toBe('');
    });
});

describe('weekdayLabel', () => {
    it('names the weekday of a date, or null when unscheduled', () => {
        expect(weekdayLabel(new Date(2026, 8, 25))).toBe('Sexta');
        expect(weekdayLabel(null)).toBeNull();
    });
});

describe('matchesSearch', () => {
    const w = workout([exercise({ name: 'Supino Reto' })], 'Hipertrofia A');

    it('matches the workout name or an exercise name, ignoring case and accents', () => {
        expect(matchesSearch(w, 'hipertrofia')).toBe(true);
        expect(matchesSearch(w, 'SUPINO')).toBe(true);
        expect(matchesSearch(workout([], 'Calistenia Força'), 'forca')).toBe(true);
    });

    it('does not match unrelated text and matches everything when empty', () => {
        expect(matchesSearch(w, 'agachamento')).toBe(false);
        expect(matchesSearch(w, '  ')).toBe(true);
    });
});
