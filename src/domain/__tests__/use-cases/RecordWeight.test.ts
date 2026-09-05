import { recordWeight } from '../../use-cases/weight/RecordWeight';
import { IWeightRepository } from '../../ports/WeightRepository';
import { WeightRecord } from '../../entities/WeightRecord';

function makeRepo(latest: WeightRecord | null = null): IWeightRepository & { saved: WeightRecord[] } {
    const saved: WeightRecord[] = [];
    return {
        saved,
        getWeightHistory: jest.fn(async () => saved),
        saveWeightRecord: jest.fn(async (record: WeightRecord) => {
            saved.push(record);
        }),
        getLatestWeight: jest.fn(async () => latest),
    };
}

describe('recordWeight', () => {
    it('saves a record attributed to the given authenticated userId', async () => {
        const repo = makeRepo();

        const record = await recordWeight(repo, 'auth-user-123', 82.5, 18, 22);

        expect(record.userId).toBe('auth-user-123');
        expect(record.weightKg).toBe(82.5);
        expect(record.bodyFatPercentage).toBe(18);
        expect(record.proteinPercentage).toBe(22);
        expect(repo.saveWeightRecord).toHaveBeenCalledWith(record);
        expect(repo.saved).toHaveLength(1);
    });

    it('works for a user with no previous weight records', async () => {
        const repo = makeRepo(null); // no history at all

        const record = await recordWeight(repo, 'new-user-456', 70, null, null);

        expect(record.userId).toBe('new-user-456');
        expect(repo.saved).toHaveLength(1);
    });

    it('never inherits userId from a previous record belonging to another user', async () => {
        const repo = makeRepo({
            id: 'weight-old',
            userId: 'other-user',
            weightKg: 90,
            bodyFatPercentage: null,
            proteinPercentage: null,
            recordedAt: new Date(2024, 0, 1),
        });

        const record = await recordWeight(repo, 'auth-user-123', 80, null, null);

        expect(record.userId).toBe('auth-user-123');
        expect(record.userId).not.toBe('other-user');
    });

    it('rejects when userId is empty', async () => {
        const repo = makeRepo();

        await expect(recordWeight(repo, '', 80, null, null)).rejects.toThrow('User ID is required');
        expect(repo.saveWeightRecord).not.toHaveBeenCalled();
    });

    it('rejects when weight is not positive', async () => {
        const repo = makeRepo();

        await expect(recordWeight(repo, 'auth-user-123', 0, null, null)).rejects.toThrow(
            'Weight must be greater than 0',
        );
        expect(repo.saveWeightRecord).not.toHaveBeenCalled();
    });
});
