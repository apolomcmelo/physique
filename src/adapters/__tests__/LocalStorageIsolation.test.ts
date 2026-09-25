import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem } from '../local/LocalStorage';

let mockCurrentUserId: string | null = 'account-a';
const mockRecords = new Map<string, string>();

jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: mockCurrentUserId ? { id: mockCurrentUserId } : null }, error: null }) } },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async (key: string) => mockRecords.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockRecords.set(key, value); }),
}));

describe('local repository storage', () => {
    beforeEach(() => { mockRecords.clear(); mockCurrentUserId = 'account-a'; });

    it('does not expose another account or legacy unscoped data', async () => {
        mockRecords.set('@physique/exams', JSON.stringify([{ title: 'legacy private record' }]));
        await setItem('@physique/exams', [{ title: 'account A' }]);
        mockCurrentUserId = 'account-b';
        expect(await getItem('@physique/exams')).toBeNull();
        await setItem('@physique/exams', [{ title: 'account B' }]);
        mockCurrentUserId = 'account-a';
        expect(await getItem('@physique/exams')).toEqual([{ title: 'account A' }]);
        expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('@physique/exams');
        expect(mockRecords.get('@physique/exams')).toBe(JSON.stringify([{ title: 'legacy private record' }]));
    });

    it('fails closed when not signed in', async () => {
        mockCurrentUserId = null;
        await expect(getItem('@physique/exams')).rejects.toThrow('No authenticated user');
        await expect(setItem('@physique/exams', [])).rejects.toThrow('No authenticated user');
    });
});
