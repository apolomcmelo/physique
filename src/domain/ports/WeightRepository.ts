import { WeightRecord } from '../entities/WeightRecord';

export interface IWeightRepository {
    getWeightHistory(): Promise<WeightRecord[]>;
    saveWeightRecord(record: WeightRecord): Promise<void>;
    updateWeightRecord(record: WeightRecord): Promise<void>;
    deleteWeightRecord(id: string): Promise<void>;
    getLatestWeight(): Promise<WeightRecord | null>;
}
