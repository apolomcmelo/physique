import { User } from '../entities/User';

export interface IUserRepository {
    getUser(): Promise<User | null>;
    getCurrentUserId(): Promise<string | null>;
    saveUser(user: User): Promise<void>;
    updateUser(user: User): Promise<void>;
}
