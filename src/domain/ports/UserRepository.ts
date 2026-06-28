import { User } from '../entities/User';

export interface IUserRepository {
    getUser(): Promise<User | null>;
    saveUser(user: User): Promise<void>;
    updateUser(user: User): Promise<void>;
}
