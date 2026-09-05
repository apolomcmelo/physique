import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// babel-preset-expo inlines direct `process.env.EXPO_PUBLIC_*` member access at
// build time; these constants hold the build-time values used as fallbacks.
const BUILD_TIME_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const BUILD_TIME_SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/**
 * Runtime (non-inlined) env lookup. Computed member access is preserved by
 * babel, so tests and dev tools can override EXPO_PUBLIC_* vars at runtime.
 * In production Hermes there is no `process.env`, so this returns undefined
 * and the build-time inlined fallback is used.
 */
function runtimeEnv(key: string): string | undefined {
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key];
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    const supabaseUrl = runtimeEnv('EXPO_PUBLIC_SUPABASE_URL') ?? BUILD_TIME_SUPABASE_URL;
    const supabaseAnonKey = runtimeEnv('EXPO_PUBLIC_SUPABASE_KEY') ?? BUILD_TIME_SUPABASE_KEY;
    if (!supabaseUrl) {
        throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL in your .env file.');
    }
    if (!_client) {
        _client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storage: AsyncStorage,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: Platform.OS === 'web',
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

