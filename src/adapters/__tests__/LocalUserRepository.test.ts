import { LocalUserRepository } from '../local/LocalUserRepository';
import { User } from '../../domain/entities/User';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('../../adapters/local/LocalStorage', () => ({
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
}));

const storedUser: User = {
    id: 'local-user-1',
    name: 'Local User',
    dateOfBirth: new Date(1990, 0, 1),
    height: 175,
    currentWeight: 80,
    goalWeight: 75,
    bodyFatPercentage: null,
    proteinPercentage: null,
    objective: 'Stay fit',
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
};

describe('LocalUserRepository', () => {
    let repo: LocalUserRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new LocalUserRepository();
    });

    describe('getCurrentUserId()', () => {
        it('returns the stored user id when a local profile exists', async () => {
            mockGetItem.mockResolvedValue(storedUser);

            await expect(repo.getCurrentUserId()).resolves.toBe('local-user-1');
        });

        it('returns null when no local profile exists', async () => {
            mockGetItem.mockResolvedValue(null);

            await expect(repo.getCurrentUserId()).resolves.toBeNull();
        });
    });
});
