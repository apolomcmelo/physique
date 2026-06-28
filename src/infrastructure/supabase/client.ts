import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabaseUrl) {
        throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL in your .env file.');
    }
    if (!_client) {
        _client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: AsyncStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    }
    return _client;
}

/** @deprecated Use getSupabaseClient() for lazy initialization */
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
    },
});

