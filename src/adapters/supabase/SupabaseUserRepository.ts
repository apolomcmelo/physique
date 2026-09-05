import { IUserRepository } from '../../domain/ports/UserRepository';
import { User, createUser } from '../../domain/entities/User';
import { supabase } from '../../infrastructure/supabase/client';

interface UserProfileRow {
    id: string;
    user_id: string;
    name: string;
    date_of_birth: string;
    height_cm: number;
    current_weight_kg: number;
    goal_weight_kg: number;
    body_fat_percentage: number | null;
    protein_percentage: number | null;
    objective: string;
    created_at: string;
    updated_at: string;
}

function rowToUser(row: UserProfileRow): User {
    return {
        id: row.id,
        name: row.name,
        dateOfBirth: new Date(row.date_of_birth),
        height: row.height_cm,
        currentWeight: row.current_weight_kg,
        goalWeight: row.goal_weight_kg,
        bodyFatPercentage: row.body_fat_percentage,
        proteinPercentage: row.protein_percentage,
        objective: row.objective,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

function userToRow(user: User): Omit<UserProfileRow, 'user_id' | 'created_at' | 'updated_at'> & { updated_at: string } {
    return {
        id: user.id,
        name: user.name,
        date_of_birth: [
            user.dateOfBirth.getFullYear(),
            String(user.dateOfBirth.getMonth() + 1).padStart(2, '0'),
            String(user.dateOfBirth.getDate()).padStart(2, '0'),
        ].join('-'),
        height_cm: user.height,
        current_weight_kg: user.currentWeight,
        goal_weight_kg: user.goalWeight,
        body_fat_percentage: user.bodyFatPercentage,
        protein_percentage: user.proteinPercentage,
        objective: user.objective,
        updated_at: new Date().toISOString(),
    };
}

export class SupabaseUserRepository implements IUserRepository {
    async getCurrentUserId(): Promise<string | null> {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
    }

    async getUser(): Promise<User | null> {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            throw new Error(`Failed to get authenticated user: ${authError.message}`);
        }

        const authUserId = authData.user?.id;
        if (!authUserId) {
            return null;
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUserId)
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to get user: ${error.message}`);
        }

        return data ? rowToUser(data as UserProfileRow) : null;
    }

    async saveUser(user: User): Promise<void> {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            throw new Error(`Failed to get authenticated user: ${authError.message}`);
        }

        const authUserId = authData.user?.id;
        if (!authUserId) {
            throw new Error('User must be authenticated before saving a profile');
        }

        const row = {
            ...userToRow(user),
            user_id: authUserId,
            created_at: user.createdAt.toISOString(),
        };

        const { error } = await supabase.from('user_profiles').insert(row);

        if (error) {
            throw new Error(`Failed to save user: ${error.message}`);
        }
    }

    async updateUser(user: User): Promise<void> {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            throw new Error(`Failed to get authenticated user: ${authError.message}`);
        }

        const authUserId = authData.user?.id;
        if (!authUserId) {
            throw new Error('User must be authenticated before updating a profile');
        }

        const row = {
            ...userToRow(user),
            user_id: authUserId,
        };

        const { error } = await supabase
            .from('user_profiles')
            .update(row)
            .eq('user_id', authUserId)
            .eq('id', user.id);

        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }
}
