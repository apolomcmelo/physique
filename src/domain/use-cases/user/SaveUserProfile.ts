import { User, createUser } from '../../entities/User';
import { IUserRepository } from '../../ports/UserRepository';

export async function saveUserProfile(
    repo: IUserRepository,
    params: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<User> {
    const existing = await repo.getUser();

    if (existing) {
        const updated: User = {
            ...existing,
            ...params,
            updatedAt: new Date(),
        };
        await repo.updateUser(updated);
        return updated;
    }

    const user = createUser(params);
    await repo.saveUser(user);
    return user;
}
