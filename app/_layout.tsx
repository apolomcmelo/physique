import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SupabaseProvider } from '../src/ui/hooks/useSupabase';
import { AuthProvider, useAuth } from '../src/ui/hooks/useAuth';

function AuthGate() {
    const segments = useSegments();
    const { session, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        const isLoginRoute = (segments[0] as string | undefined)?.toLowerCase() === 'login';

        if (!session && !isLoginRoute) {
            router.replace('/login' as never);
            return;
        }

        if (session && isLoginRoute) {
            router.replace('/(tabs)' as never);
        }
    }, [session, isLoading, segments]);

    return null;
}

export default function RootLayout() {
    return (
        <SupabaseProvider>
            <AuthProvider>
                <AuthGate />
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#0A0A0F' },
                    }}
                >
                    <Stack.Screen name="login" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="workout/active" />
                    <Stack.Screen name="camera/index" />
                    <Stack.Screen name="exams/index" />
                </Stack>
            </AuthProvider>
        </SupabaseProvider>
    );
}
