import { generateId } from '../value-objects/UUID';

export interface User {
    id: string;
    name: string;
    age: number;
    height: number;
    currentWeight: number;
    goalWeight: number;
    bodyFatPercentage: number | null;
    proteinPercentage: number | null;
    objective: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateUserParams = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export function createUser(params: CreateUserParams): User {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('User name is required');
    }
    if (params.age <= 0) {
        throw new Error('Age must be greater than 0');
    }
    if (params.height <= 0) {
        throw new Error('Height must be greater than 0');
    }
    if (params.currentWeight <= 0) {
        throw new Error('Current weight must be greater than 0');
    }
    if (params.goalWeight <= 0) {
        throw new Error('Goal weight must be greater than 0');
    }
    if (!params.objective || params.objective.trim().length === 0) {
        throw new Error('Objective is required');
    }

    const now = new Date();
    return {
        ...params,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
    };
}
