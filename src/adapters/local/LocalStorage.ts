import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireAuthUserId } from '../supabase/currentAuthUser';

async function accountKey(key: string): Promise<string> {
    return `${key}/${await requireAuthUserId()}`;
}

export async function getAccountId(): Promise<string> {
    return requireAuthUserId();
}

export async function setItemForAccount<T>(key: string, value: T, accountId: string): Promise<void> {
    if (await requireAuthUserId() !== accountId) throw new Error('Account changed during local write');
    await AsyncStorage.setItem(`${key}/${accountId}`, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(await accountKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(await accountKey(key), JSON.stringify(value));
}
