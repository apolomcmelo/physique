import { User } from '../../domain/entities/User';
import { WeightRecord } from '../../domain/entities/WeightRecord';
import { LocalWeightRepository } from '../local/LocalWeightRepository';

let mockStoredRecords: WeightRecord[] | null = null;
let mockMigrationDone = false;
let mockStoredUser: User | null = null;
const mockSetItem = jest.fn(async (key: string, value: unknown) => {
    if (key === '@physique/weight_records') mockStoredRecords = value as WeightRecord[];
    if (key === '@physique/weight_records_migrated') mockMigrationDone = value as boolean;
});

jest.mock('../local/LocalStorage', () => ({
    getItem: jest.fn(async (key: string) => {
        if (key === '@physique/weight_records') return mockStoredRecords;
        if (key === '@physique/weight_records_migrated') return mockMigrationDone;
        if (key === '@physique/user') return mockStoredUser;
        return null;
    }),
    setItem: (key: string, value: unknown) => mockSetItem(key, value),
}));

const legacyUser: User = {
    id: 'local-user',
    name: 'Local User',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    height: 175,
    currentWeight: 80,
    goalWeight: 70,
    bodyFatPercentage: 18,
    proteinPercentage: null,
    objective: 'Health',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

describe('LocalWeightRepository', () => {
    beforeEach(() => {
        mockStoredRecords = null;
        mockMigrationDone = false;
        mockStoredUser = legacyUser;
        jest.clearAllMocks();
    });

    it('preserves a legacy profile measurement as one stable baseline', async () => {
        const repository = new LocalWeightRepository();
        const first = await repository.getWeightHistory();
        const second = await repository.getWeightHistory();
        expect(first).toHaveLength(1);
        expect(first[0]).toMatchObject({ id: 'legacy-baseline:local-user', weightKg: 80, bodyFatPercentage: 18 });
        expect(first[0].recordedAt).toEqual(legacyUser.createdAt);
        expect(second).toHaveLength(1);
    });

    it('updates and deletes only the selected record', async () => {
        const repository = new LocalWeightRepository();
        mockStoredRecords = [
            { id: 'one', userId: 'local-user', weightKg: 80, bodyFatPercentage: null, proteinPercentage: null, recordedAt: new Date() },
            { id: 'two', userId: 'local-user', weightKg: null, bodyFatPercentage: 18, proteinPercentage: null, recordedAt: new Date() },
        ];
        mockMigrationDone = true;

        await repository.updateWeightRecord({ ...mockStoredRecords[0], weightKg: 79.5 });
        expect(mockStoredRecords?.map((record) => record.weightKg)).toEqual([79.5, null]);
        await repository.deleteWeightRecord('one');
        expect(mockStoredRecords?.map((record) => record.id)).toEqual(['two']);
    });
});
