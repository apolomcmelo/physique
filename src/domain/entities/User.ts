import { generateId } from '../value-objects/UUID';

export interface User {
    id: string;
    name: string;
    dateOfBirth: Date;
    height: number;
    currentWeight: number | null;
    goalWeight: number;
    bodyFatPercentage: number | null;
    proteinPercentage: number | null;
    objective: string;
    timezone?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateUserParams = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

export function getDeviceTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function isValidTimezone(timezone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}

export function calculateAge(dateOfBirth: Date, referenceDate: Date = new Date()): number {
    const birth = new Date(dateOfBirth);
    const ref = new Date(referenceDate);

    if (Number.isNaN(birth.getTime())) {
        throw new Error('Date of birth must be a valid date');
    }

    let age = ref.getFullYear() - birth.getFullYear();
    const monthDiff = ref.getMonth() - birth.getMonth();
    const dayDiff = ref.getDate() - birth.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age -= 1;
    }

    return Math.max(0, age);
}

export function createUser(params: CreateUserParams): User {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('User name is required');
    }
    if (Number.isNaN(params.dateOfBirth.getTime())) {
        throw new Error('Date of birth must be a valid date');
    }
    if (params.dateOfBirth.getTime() > Date.now()) {
        throw new Error('Date of birth cannot be in the future');
    }
    if (params.height <= 0) {
        throw new Error('Height must be greater than 0');
    }
    if (params.currentWeight !== null && (!Number.isFinite(params.currentWeight) || params.currentWeight <= 0)) {
        throw new Error('Current weight must be greater than 0');
    }
    if (params.goalWeight <= 0) {
        throw new Error('Goal weight must be greater than 0');
    }
    if (!params.objective || params.objective.trim().length === 0) {
        throw new Error('Objective is required');
    }
    if (params.bodyFatPercentage !== null
        && (!Number.isFinite(params.bodyFatPercentage) || params.bodyFatPercentage < 0 || params.bodyFatPercentage > 100)) {
        throw new Error('Body fat percentage must be between 0 and 100');
    }
    if (params.proteinPercentage !== null
        && (!Number.isFinite(params.proteinPercentage) || params.proteinPercentage < 0 || params.proteinPercentage > 100)) {
        throw new Error('Protein percentage must be between 0 and 100');
    }
    if (!isValidTimezone(params.timezone ?? getDeviceTimezone())) {
        throw new Error('Timezone must be a valid IANA timezone');
    }

    const now = new Date();
    return {
        ...params,
        timezone: params.timezone ?? getDeviceTimezone(),
        id: generateId(),
        createdAt: now,
        updatedAt: now,
    };
}
