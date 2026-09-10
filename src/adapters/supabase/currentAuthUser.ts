import { supabase } from '../../infrastructure/supabase/client';

/**
 * Returns the id of the currently authenticated Supabase user.
 * Throws when there is no session — owner-scoped RLS policies
 * (auth.uid() = user_id) reject inserts without a user_id anyway,
 * so failing fast here produces a clearer error.
 */
export async function requireAuthUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        throw new Error(`Failed to get authenticated user: ${error.message}`);
    }
    const userId = data.user?.id;
    if (!userId) {
        throw new Error('No authenticated user — sign in before saving data');
    }
    return userId;
}
