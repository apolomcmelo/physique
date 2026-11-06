import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import RootLayout from '../_layout';
import { FONT_ASSETS } from '../../src/ui/theme';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-router', () => {
    const { Text: MockText } = jest.requireActual('react-native');
    const Stack = () => <MockText>app-stack</MockText>;
    Stack.Screen = () => null;
    return { Stack, router: { replace: jest.fn() }, useSegments: () => [] };
});
jest.mock('../../src/ui/hooks/useSupabase', () => ({
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../src/ui/hooks/useAuth', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({ session: null, isLoading: true }),
}));

const mockedUseFonts = useFonts as jest.Mock;

describe('RootLayout fonts', () => {
    it('loads the design-system fonts', () => {
        mockedUseFonts.mockReturnValue([true, null]);
        render(<RootLayout />);
        expect(mockedUseFonts).toHaveBeenCalledWith(FONT_ASSETS);
    });

    it('waits for fonts before rendering the app', () => {
        mockedUseFonts.mockReturnValue([false, null]);
        render(<RootLayout />);
        expect(screen.queryByText('app-stack')).toBeNull();
    });

    it('still renders the app with fallback fonts when loading fails', () => {
        mockedUseFonts.mockReturnValue([false, new Error('network')]);
        render(<RootLayout />);
        expect(screen.getByText('app-stack')).toBeTruthy();
    });
});
