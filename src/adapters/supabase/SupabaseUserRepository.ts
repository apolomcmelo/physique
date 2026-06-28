import { IUserRepository } from '../../domain/ports/UserRepository';
import { User, createUser } from '../../domain/entities/User';
import { supabase } from '../../infrastructure/supabase/client';

interface UserProfileRow {
    id: string;
    name: string;
    age: number;
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
        age: row.age,
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

function userToRow(user: User): Omit<UserProfileRow, 'created_at' | 'updated_at'> & { updated_at: string } {
    return {
        id: user.id,
        name: user.name,
        age: user.age,
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
    async getUser(): Promise<User | null> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found
                return null;
            }
            throw new Error(`Failed to get user: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return rowToUser(data as UserProfileRow);
    }

    async saveUser(user: User): Promise<void> {
        const row = {
            ...userToRow(user),
            created_at: user.createdAt.toISOString(),
        };

        const { error } = await supabase.from('user_profiles').insert(row);

        if (error) {
            throw new Error(`Failed to save user: ${error.message}`);
        }
    }

    async updateUser(user: User): Promise<void> {
        const row = userToRow(user);

        const { error } = await supabase
            .from('user_profiles')
            .update(row)
            .eq('id', user.id);

        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }
}
