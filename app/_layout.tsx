import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SupabaseProvider } from '../src/ui/hooks/useSupabase';

export default function RootLayout() {
    return (
        <SupabaseProvider>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0A0A0F' },
                }}
            >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="workout/active" />
                <Stack.Screen name="camera/index" />
                <Stack.Screen name="exams/index" />
            </Stack>
        </SupabaseProvider>
    );
}
