import { WeightRecord } from '../../domain/entities/WeightRecord';
import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/weight_records';

function parseRecord(raw: WeightRecord): WeightRecord {
    return {
        ...raw,
        recordedAt: new Date(raw.recordedAt),
    };
}

export class LocalWeightRepository implements IWeightRepository {
    async getWeightHistory(): Promise<WeightRecord[]> {
        const raw = await getItem<WeightRecord[]>(KEY);
        return (raw ?? []).map(parseRecord);
    }

    async saveWeightRecord(record: WeightRecord): Promise<void> {
        const records = await getItem<WeightRecord[]>(KEY) ?? [];
        records.push(record);
        await setItem(KEY, records);
    }

    async getLatestWeight(): Promise<WeightRecord | null> {
        const records = await this.getWeightHistory();
        if (records.length === 0) return null;
        return records.reduce((latest, r) =>
            r.recordedAt > latest.recordedAt ? r : latest,
        );
    }
}
