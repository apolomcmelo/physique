import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../infrastructure/supabase/client';

interface AuthContextValue {
    session: Session | null;
    user: Session['user'] | null;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadInitialSession() {
            const { data, error } = await getSupabaseClient().auth.getSession();
            if (!mounted) return;
            if (!error) setSession(data.session ?? null);
            setIsLoading(false);
        }

        loadInitialSession();

        const { data: authListener } = getSupabaseClient().auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) return;
            setSession(nextSession ?? null);
            setIsLoading(false);
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        session,
        user: session?.user ?? null,
        isLoading,
        signInWithGoogle: async () => {
            const { error } = await getSupabaseClient().auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
                },
            });

            if (error) {
                throw new Error(error.message);
            }
        },
        signOut: async () => {
            const { error } = await getSupabaseClient().auth.signOut();
            if (error) {
                throw new Error(error.message);
            }
            setSession(null);
        },
    }), [session, isLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
