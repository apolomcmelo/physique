import { WeightRecord } from '../../domain/entities/WeightRecord';
import { User } from '../../domain/entities/User';
import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/weight_records';
const MIGRATED_KEY = '@physique/weight_records_migrated';
const USER_KEY = '@physique/user';

function parseRecord(raw: WeightRecord): WeightRecord {
    return {
        ...raw,
        recordedAt: new Date(raw.recordedAt),
    };
}

export class LocalWeightRepository implements IWeightRepository {
    async getWeightHistory(): Promise<WeightRecord[]> {
        let raw = await getItem<WeightRecord[]>(KEY);
        if (!await getItem<boolean>(MIGRATED_KEY)) {
            const profile = await getItem<User>(USER_KEY);
            if (profile) {
                const records = raw ?? [];
                const missingWeight = !records.some((record) => record.weightKg !== null);
                const missingBodyFat = !records.some((record) => record.bodyFatPercentage !== null);
                const missingProtein = !records.some((record) => record.proteinPercentage !== null);
                const legacyWeight = missingWeight ? profile.currentWeight : null;
                const legacyBodyFat = missingBodyFat ? profile.bodyFatPercentage : null;
                const legacyProtein = missingProtein ? profile.proteinPercentage : null;
                if (legacyWeight !== null || legacyBodyFat !== null || legacyProtein !== null) {
                    const legacyRecord: WeightRecord = {
                        id: `legacy-baseline:${profile.id}`,
                        userId: profile.id,
                        weightKg: legacyWeight,
                        bodyFatPercentage: legacyBodyFat,
                        proteinPercentage: legacyProtein,
                        recordedAt: new Date(profile.createdAt),
                    };
                    raw = [...records.filter((record) => record.id !== legacyRecord.id), legacyRecord];
                    await setItem(KEY, raw);
                }
                await setItem(MIGRATED_KEY, true);
            }
        }
        return (raw ?? []).map(parseRecord);
    }

    async saveWeightRecord(record: WeightRecord): Promise<void> {
        const records = await getItem<WeightRecord[]>(KEY) ?? [];
        await setItem(KEY, [...records.filter((item) => item.id !== record.id), record]);
    }

    async updateWeightRecord(record: WeightRecord): Promise<void> {
        const records = await getItem<WeightRecord[]>(KEY) ?? [];
        if (!records.some((item) => item.id === record.id)) {
            throw new Error(`Weight record not found: ${record.id}`);
        }
        await setItem(KEY, records.map((item) => item.id === record.id ? record : item));
    }

    async deleteWeightRecord(id: string): Promise<void> {
        const records = await getItem<WeightRecord[]>(KEY) ?? [];
        if (!records.some((item) => item.id === id)) {
            throw new Error(`Weight record not found: ${id}`);
        }
        await setItem(KEY, records.filter((item) => item.id !== id));
    }

    async getLatestWeight(): Promise<WeightRecord | null> {
        const records = (await this.getWeightHistory()).filter((record) => record.weightKg !== null);
        if (records.length === 0) return null;
        return records.reduce((latest, r) =>
            r.recordedAt > latest.recordedAt ? r : latest,
        );
    }
}
