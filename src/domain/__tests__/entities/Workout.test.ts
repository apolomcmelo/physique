import { createWorkout, createExercise } from '../../entities/Workout';

describe('createWorkout', () => {
    it('creates a valid workout of type Calisthenics', () => {
        const workout = createWorkout({
            name: 'Bodyweight Circuit',
            type: 'Calisthenics',
            exercises: [],
            scheduledAt: new Date(2024, 0, 1, 7, 0),
        });
        expect(workout.name).toBe('Bodyweight Circuit');
        expect(workout.type).toBe('Calisthenics');
        expect(workout.id).toBeDefined();
        expect(workout.createdAt).toBeInstanceOf(Date);
        expect(workout.updatedAt).toBeInstanceOf(Date);
    });

    it('creates a valid workout of type HIT with null sets/reps/weight on exercises', () => {
        const hitExercise = createExercise({
            name: 'Burpees',
            sets: null,
            repsPerSet: null,
            weightKg: null,
            notes: 'Max effort for 30s',
        });
        const workout = createWorkout({
            name: 'HIIT Cardio',
            type: 'HIT',
            exercises: [hitExercise],
            scheduledAt: null,
        });
        expect(workout.type).toBe('HIT');
        expect(workout.exercises[0].sets).toBeNull();
        expect(workout.exercises[0].repsPerSet).toBeNull();
        expect(workout.exercises[0].weightKg).toBeNull();
    });

    it('creates a valid workout of type Weightlifting', () => {
        const exercise = createExercise({
            name: 'Squat',
            sets: 4,
            repsPerSet: 8,
            weightKg: 80,
            notes: null,
        });
        const workout = createWorkout({
            name: 'Leg Day',
            type: 'Weightlifting',
            exercises: [exercise],
            scheduledAt: new Date(2024, 0, 2, 18, 0),
        });
        expect(workout.type).toBe('Weightlifting');
        expect(workout.exercises).toHaveLength(1);
        expect(workout.exercises[0].weightKg).toBe(80);
    });

    it('throws if name is empty', () => {
        expect(() =>
            createWorkout({ name: '', type: 'Calisthenics', exercises: [], scheduledAt: null }),
        ).toThrow('Workout name is required');
    });
});

describe('createExercise', () => {
    it('creates valid exercise with all fields', () => {
        const exercise = createExercise({
            name: 'Bench Press',
            sets: 3,
            repsPerSet: 10,
            weightKg: 60,
            notes: 'Keep elbows at 45°',
        });
        expect(exercise.name).toBe('Bench Press');
        expect(exercise.sets).toBe(3);
        expect(exercise.repsPerSet).toBe(10);
        expect(exercise.weightKg).toBe(60);
        expect(exercise.notes).toBe('Keep elbows at 45°');
        expect(exercise.id).toBeDefined();
    });

    it('allows null sets/reps/weight for HIT exercises', () => {
        const exercise = createExercise({
            name: 'Sprint',
            sets: null,
            repsPerSet: null,
            weightKg: null,
            notes: null,
        });
        expect(exercise.sets).toBeNull();
        expect(exercise.repsPerSet).toBeNull();
        expect(exercise.weightKg).toBeNull();
    });

    it('throws if name is empty', () => {
        expect(() =>
            createExercise({ name: '', sets: 3, repsPerSet: 10, weightKg: null, notes: null }),
        ).toThrow('Exercise name is required');
    });
});
