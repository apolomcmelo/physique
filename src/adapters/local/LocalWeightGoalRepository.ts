import { WeightGoal } from '../../domain/entities/WeightGoal';
import { IWeightGoalRepository } from '../../domain/ports/WeightGoalRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/weight_goals';

function reviveGoal(goal: WeightGoal): WeightGoal {
    return { ...goal, startedAt: new Date(goal.startedAt), createdAt: new Date(goal.createdAt) };
}

export class LocalWeightGoalRepository implements IWeightGoalRepository {
    async getWeightGoals(): Promise<WeightGoal[]> {
        return (await getItem<WeightGoal[]>(KEY) ?? []).map(reviveGoal);
    }

    async saveWeightGoal(goal: WeightGoal): Promise<void> {
        const goals = await getItem<WeightGoal[]>(KEY) ?? [];
        if (goals.some((item) => item.id === goal.id)) throw new Error(`Weight goal already exists: ${goal.id}`);
        await setItem(KEY, [...goals, goal]);
    }
}
