import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/ports/UserRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/user';

export class LocalUserRepository implements IUserRepository {
    async getCurrentUserId(): Promise<string | null> {
        const user = await this.getUser();
        return user?.id ?? null;
    }

    async getUser(): Promise<User | null> {
        const stored = await getItem<User & { timezone?: string }>(KEY);
        if (!stored) return null;
        const { timezone: _legacyTimezone, ...raw } = stored;
        return {
            ...raw,
            dateOfBirth: new Date(raw.dateOfBirth),
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt),
        };
    }

    async saveUser(user: User): Promise<void> {
        await setItem(KEY, user);
    }

    async updateUser(user: User): Promise<void> {
        await setItem(KEY, user);
    }
}
