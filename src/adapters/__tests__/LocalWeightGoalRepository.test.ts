import { WeightGoal } from '../../domain/entities/WeightGoal';
import { LocalWeightGoalRepository } from '../local/LocalWeightGoalRepository';

let mockStoredGoals: WeightGoal[] = [];

jest.mock('../local/LocalStorage', () => ({
    getItem: jest.fn(async () => mockStoredGoals),
    setItem: jest.fn(async (_key: string, value: WeightGoal[]) => { mockStoredGoals = value; }),
}));

describe('LocalWeightGoalRepository', () => {
    beforeEach(() => {
        mockStoredGoals = [];
    });

    it('persists goal history and revives dates', async () => {
        const repository = new LocalWeightGoalRepository();
        const goal: WeightGoal = {
            id: 'goal-1',
            userId: 'user-1',
            targetWeightKg: 70,
            startedAt: new Date('2026-10-01T00:00:00.000Z'),
            createdAt: new Date('2026-09-30T12:00:00.000Z'),
        };
        await repository.saveWeightGoal(goal);
        const result = await repository.getWeightGoals();
        expect(result).toHaveLength(1);
        expect(result[0].startedAt).toEqual(goal.startedAt);
        expect(result[0].createdAt).toEqual(goal.createdAt);
    });

    it('rejects saving the same goal id twice', async () => {
        const repository = new LocalWeightGoalRepository();
        const goal: WeightGoal = {
            id: 'goal-1',
            userId: 'user-1',
            targetWeightKg: 70,
            startedAt: new Date('2026-10-01T00:00:00.000Z'),
            createdAt: new Date('2026-09-30T12:00:00.000Z'),
        };
        await repository.saveWeightGoal(goal);
        await expect(repository.saveWeightGoal(goal)).rejects.toThrow('Weight goal already exists: goal-1');
    });
});
