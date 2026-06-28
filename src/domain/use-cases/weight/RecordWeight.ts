import { WeightRecord, createWeightRecord } from '../../entities/WeightRecord';
import { IWeightRepository } from '../../ports/WeightRepository';

export async function recordWeight(
    repo: IWeightRepository,
    weightKg: number,
    bodyFatPercentage: number | null,
    proteinPercentage: number | null,
): Promise<WeightRecord> {
    const latestUser = await repo.getLatestWeight();

    const record = createWeightRecord({
        userId: latestUser?.userId ?? '',
        weightKg,
        bodyFatPercentage,
        proteinPercentage,
        recordedAt: new Date(),
    });

    await repo.saveWeightRecord(record);
    return record;
}
