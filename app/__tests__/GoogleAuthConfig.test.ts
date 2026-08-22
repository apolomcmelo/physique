jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
}));

jest.mock('react-native', () => {
    const actual = jest.requireActual('react-native');
    return {
        ...actual,
        Platform: {
            ...actual.Platform,
            OS: 'web',
        },
    };
});

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: jest.fn(() => ({
                data: {
                    subscription: { unsubscribe: jest.fn() },
                },
            })),
            signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
            signOut: jest.fn().mockResolvedValue({ error: null }),
        },
    })),
}));

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'anon-key';

const { createClient } = jest.requireMock('@supabase/supabase-js');
const { getSupabaseClient } = require('../../src/infrastructure/supabase/client');

describe('Google OAuth configuration', () => {
    it('enables session detection from OAuth callback URLs on web', () => {
        getSupabaseClient();

        expect(createClient).toHaveBeenCalledWith(
            'https://example.supabase.co',
            'anon-key',
            expect.objectContaining({
                auth: expect.objectContaining({
                    detectSessionInUrl: true,
                }),
            }),
        );
    });
});
