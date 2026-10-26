import { WeightRecord, createWeightRecord } from '../../entities/WeightRecord';
import { IWeightRepository } from '../../ports/WeightRepository';

export async function recordWeight(
    repo: IWeightRepository,
    userId: string,
    weightKg: number | null,
    bodyFatPercentage: number | null,
    proteinPercentage: number | null,
    recordedAt: Date = new Date(),
): Promise<WeightRecord> {
    const record = createWeightRecord({
        userId,
        weightKg,
        bodyFatPercentage,
        proteinPercentage,
        recordedAt,
    });

    await repo.saveWeightRecord(record);
    return record;
}
