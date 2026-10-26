import { WeightGoal } from '../entities/WeightGoal';

export interface IWeightGoalRepository {
    getWeightGoals(): Promise<WeightGoal[]>;
    saveWeightGoal(goal: WeightGoal): Promise<void>;
}
