import { WeightRecord } from '../entities/WeightRecord';

export interface IWeightRepository {
    getWeightHistory(): Promise<WeightRecord[]>;
    saveWeightRecord(record: WeightRecord): Promise<void>;
    getLatestWeight(): Promise<WeightRecord | null>;
}
