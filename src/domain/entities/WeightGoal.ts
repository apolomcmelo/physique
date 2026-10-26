import { generateId } from '../value-objects/UUID';
import { WeightRecord } from './WeightRecord';

export interface WeightGoal {
    id: string;
    userId: string;
    targetWeightKg: number;
    startedAt: Date;
    createdAt: Date;
}

export type CreateWeightGoalParams = Omit<WeightGoal, 'id' | 'createdAt'>;

export function createWeightGoal(params: CreateWeightGoalParams): WeightGoal {
    if (!params.userId.trim()) throw new Error('User ID is required');
    if (!Number.isFinite(params.targetWeightKg) || params.targetWeightKg <= 0) {
        throw new Error('Goal weight must be greater than 0');
    }
    if (!Number.isFinite(params.startedAt.getTime())) throw new Error('Goal start date must be valid');
    return { ...params, id: generateId(), createdAt: new Date() };
}

export function selectWeightGoal(goals: WeightGoal[], at: Date = new Date()): WeightGoal | null {
    return goals
        .filter((goal) => goal.startedAt.getTime() <= at.getTime())
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null;
}

export function selectWeightBaseline(records: WeightRecord[], goal: WeightGoal): WeightRecord | null {
    return records
        .filter((record) => record.weightKg !== null && record.recordedAt.getTime() <= goal.startedAt.getTime())
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0] ?? null;
}

export interface WeightGoalProgress {
    currentWeightKg: number;
    targetWeightKg: number;
    baselineWeightKg: number;
    remainingWeightKg: number;
    progress: number;
}

export function calculateWeightGoalProgress(
    currentWeightKg: number | null,
    goal: WeightGoal,
    baselineWeightKg: number | null,
): WeightGoalProgress | null {
    if (currentWeightKg === null || baselineWeightKg === null) return null;
    if (![currentWeightKg, baselineWeightKg, goal.targetWeightKg].every(Number.isFinite)
        || currentWeightKg <= 0 || baselineWeightKg <= 0 || goal.targetWeightKg <= 0) return null;

    const span = goal.targetWeightKg - baselineWeightKg;
    const progress = span === 0 ? 1 : (currentWeightKg - baselineWeightKg) / span;
    return {
        currentWeightKg,
        targetWeightKg: goal.targetWeightKg,
        baselineWeightKg,
        remainingWeightKg: currentWeightKg - goal.targetWeightKg,
        progress: Math.min(1, Math.max(0, progress)),
    };
}
