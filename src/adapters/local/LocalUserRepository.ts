import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/ports/UserRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/user';

export class LocalUserRepository implements IUserRepository {
    async getUser(): Promise<User | null> {
        const raw = await getItem<User>(KEY);
        if (!raw) return null;
        return {
            ...raw,
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
