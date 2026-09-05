import { WeightRecord, createWeightRecord } from '../../entities/WeightRecord';
import { IWeightRepository } from '../../ports/WeightRepository';

export async function recordWeight(
    repo: IWeightRepository,
    userId: string,
    weightKg: number,
    bodyFatPercentage: number | null,
    proteinPercentage: number | null,
): Promise<WeightRecord> {
    const record = createWeightRecord({
        userId,
        weightKg,
        bodyFatPercentage,
        proteinPercentage,
        recordedAt: new Date(),
    });

    await repo.saveWeightRecord(record);
    return record;
}
