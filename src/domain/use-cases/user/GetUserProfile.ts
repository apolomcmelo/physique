import { User } from '../../entities/User';
import { IUserRepository } from '../../ports/UserRepository';

export async function getUserProfile(repo: IUserRepository): Promise<User | null> {
    return repo.getUser();
}
