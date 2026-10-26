import { createWeightRecord } from '../../entities/WeightRecord';

const valid = {
    userId: 'user-1',
    weightKg: 75.5,
    bodyFatPercentage: null,
    proteinPercentage: null,
    recordedAt: new Date('2026-10-25T12:00:00.000Z'),
};

describe('WeightRecord', () => {
    it('supports independent readings and multiple same-day records', () => {
        const weight = createWeightRecord(valid);
        const bodyFat = createWeightRecord({
            ...valid,
            weightKg: null,
            bodyFatPercentage: 18.5,
        });
        expect(weight.recordedAt.toDateString()).toBe(bodyFat.recordedAt.toDateString());
        expect(bodyFat.weightKg).toBeNull();
        expect(bodyFat.bodyFatPercentage).toBe(18.5);
    });

    it('rejects an empty measurement and invalid percentage ranges', () => {
        expect(() => createWeightRecord({ ...valid, weightKg: null })).toThrow('At least one measurement is required');
        expect(() => createWeightRecord({ ...valid, bodyFatPercentage: 101 })).toThrow('Body fat percentage must be between 0 and 100');
        expect(() => createWeightRecord({ ...valid, proteinPercentage: -1 })).toThrow('Protein percentage must be between 0 and 100');
    });
});
