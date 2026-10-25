import { MealConsumption } from '../../domain/entities/MealConsumption';
import { IMealConsumptionRepository } from '../../domain/ports/MealConsumptionRepository';
import { getAccountId, getItem, setItemForAccount } from './LocalStorage';

const KEY = '@physique/meal_consumptions';
const pendingWrites = new Map<string, Promise<void>>();

function revive(consumption: MealConsumption): MealConsumption {
    return { ...consumption, recordedAt: new Date(consumption.recordedAt) };
}

export class LocalMealConsumptionRepository implements IMealConsumptionRepository {
    async getMealConsumptions(): Promise<MealConsumption[]> {
        const rows = await getItem<MealConsumption[]>(KEY);
        return (rows ?? []).map(revive).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
    }

    async saveMealConsumption(consumption: MealConsumption): Promise<void> {
        await this.withWrite(async (accountId) => {
            const rows = (await getItem<MealConsumption[]>(KEY) ?? []).map(revive);
            const index = rows.findIndex((row) => row.id === consumption.id);
            if (index < 0) rows.push(consumption);
            else rows[index] = consumption;
            await setItemForAccount(KEY, rows, accountId);
        });
    }

    async deleteMealConsumption(id: string): Promise<void> {
        await this.withWrite(async (accountId) => {
            const rows = await getItem<MealConsumption[]>(KEY) ?? [];
            await setItemForAccount(KEY, rows.filter((row) => row.id !== id), accountId);
        });
    }

    private async withWrite(operation: (accountId: string) => Promise<void>): Promise<void> {
        const accountId = await getAccountId();
        const previous = pendingWrites.get(accountId) ?? Promise.resolve();
        const result = previous.catch(() => undefined).then(() => operation(accountId));
        const settled = result.then(() => undefined, () => undefined);
        pendingWrites.set(accountId, settled);
        try {
            await result;
        } finally {
            if (pendingWrites.get(accountId) === settled) pendingWrites.delete(accountId);
        }
    }
}
