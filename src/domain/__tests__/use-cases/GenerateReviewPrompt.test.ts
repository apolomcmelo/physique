import { generateReviewPrompt } from '../../use-cases/prompt/GenerateReviewPrompt';
import { mockUser, mockWeightRecord } from '../setup';
import { WorkoutSession } from '../../entities/WorkoutSession';

const mockWorkoutSession: WorkoutSession = {
    id: 'session-1',
    workoutId: 'workout-1',
    startedAt: new Date(2024, 0, 1, 10, 0),
    finishedAt: new Date(2024, 0, 1, 11, 0),
    sets: [
        {
            id: 'set-1',
            exerciseId: 'exercise-1',
            setNumber: 1,
            repsCompleted: 10,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 10),
        },
        {
            id: 'set-2',
            exerciseId: 'exercise-1',
            setNumber: 2,
            repsCompleted: 10,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 20),
        },
        {
            id: 'set-3',
            exerciseId: 'exercise-1',
            setNumber: 3,
            repsCompleted: 8,
            weightUsedKg: 60,
            completedAt: new Date(2024, 0, 1, 10, 30),
        },
    ],
};

describe('generateReviewPrompt', () => {
    const result = generateReviewPrompt(
        mockUser,
        [mockWeightRecord],
        [mockWorkoutSession],
        [],
        [],
        [],
    );

    it('returns a non-empty string', () => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it("contains user's name in the output", () => {
        expect(result).toContain(mockUser.name);
    });

    it('contains weight history data', () => {
        expect(result).toContain(`${mockWeightRecord.weightKg}kg`);
    });

    it('contains workout session count', () => {
        // The summary includes "${s.sets.length} sets completed"
        expect(result).toContain(`${mockWorkoutSession.sets.length} sets completed`);
    });
});
