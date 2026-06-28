import { FoodItem } from '../../domain/entities/FoodItem';
import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/food_items';

function parseFoodItem(raw: FoodItem): FoodItem {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt),
    };
}

export class LocalFoodItemRepository implements IFoodItemRepository {
    async getFoodItems(): Promise<FoodItem[]> {
        const raw = await getItem<FoodItem[]>(KEY);
        return (raw ?? []).map(parseFoodItem);
    }

    async saveFoodItem(item: FoodItem): Promise<void> {
        const items = await getItem<FoodItem[]>(KEY) ?? [];
        items.push(item);
        await setItem(KEY, items);
    }

    async getFoodItemById(id: string): Promise<FoodItem | null> {
        const items = await this.getFoodItems();
        return items.find((i) => i.id === id) ?? null;
    }
}
