import { FoodItem } from '../../domain/entities/FoodItem';
import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';
import { getItem, setItem } from './LocalStorage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const KEY = '@physique/food_items';

interface LegacyFoodItem {
    id: string;
    name: string;
    brandOrSource: string | null;
    servingSizeGrams: number;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    ingredients: string | null;
    rawOcrText: string | null;
    createdAt: string | Date;
}

type StoredFoodItem = FoodItem | LegacyFoodItem;

function isStructuredFoodItem(raw: StoredFoodItem): raw is FoodItem {
    return 'nutritionColumns' in raw && Array.isArray(raw.nutritionColumns)
        && 'nutrients' in raw && Array.isArray(raw.nutrients);
}

function parseFoodItem(raw: StoredFoodItem): FoodItem {
    if (isStructuredFoodItem(raw)) {
        return {
            ...raw,
            originalImagePath: raw.originalImagePath ?? null,
            availableForPlanning: raw.availableForPlanning ?? true,
            createdAt: new Date(raw.createdAt),
        };
    }

    const column = { id: 'serving', label: 'Porção', basisAmount: raw.servingSizeGrams, basisUnit: 'g' };
    const macros: Array<[string, string, number, string]> = [
        ['energy', 'Calorias', raw.calories, 'kcal'],
        ['protein', 'Proteínas', raw.proteinGrams, 'g'],
        ['carbohydrates', 'Carboidratos', raw.carbsGrams, 'g'],
        ['total-fat', 'Gorduras totais', raw.fatGrams, 'g'],
    ];
    return {
        id: raw.id,
        name: raw.name,
        brandOrSource: raw.brandOrSource,
        nutritionColumns: [column],
        nutrients: macros.map(([id, label, amount, unit]) => ({
            id,
            label,
            values: [{
                columnId: column.id,
                amount,
                unit,
                dailyValuePercent: null,
                certainty: 'confirmed',
                origin: 'label',
            }],
        })),
        ingredients: raw.ingredients,
        rawOcrText: raw.rawOcrText,
        originalImagePath: null,
        availableForPlanning: true,
        createdAt: new Date(raw.createdAt),
    };
}

export class LocalFoodItemRepository implements IFoodItemRepository {
    async getFoodItems(): Promise<FoodItem[]> {
        const raw = await getItem<StoredFoodItem[]>(KEY);
        const items = (raw ?? []).map(parseFoodItem);
        if ((raw ?? []).some((item) => !isStructuredFoodItem(item)
            || !('availableForPlanning' in item) || !('originalImagePath' in item))) {
            await setItem(KEY, items);
        }
        return items;
    }

    async saveFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem> {
        const items = await this.getFoodItems();
        const originalImagePath = originalImageUri
            ? await persistLocalImage(item.id, originalImageUri)
            : item.originalImagePath;
        const savedItem = { ...item, originalImagePath };
        items.push(savedItem);
        await setItem(KEY, items);
        return savedItem;
    }

    async updateFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem> {
        const items = await this.getFoodItems();
        if (!items.some((candidate) => candidate.id === item.id)) {
            throw new Error(`Food item not found: ${item.id}`);
        }
        const originalImagePath = originalImageUri
            ? await persistLocalImage(item.id, originalImageUri)
            : item.originalImagePath;
        const savedItem = { ...item, originalImagePath };
        await setItem(KEY, items.map((candidate) => candidate.id === item.id ? savedItem : candidate));
        return savedItem;
    }

    async getFoodItemById(id: string): Promise<FoodItem | null> {
        const items = await this.getFoodItems();
        return items.find((i) => i.id === id) ?? null;
    }

    async getOriginalImageUrl(path: string): Promise<string | null> {
        return path || null;
    }
}

async function persistLocalImage(itemId: string, uri: string): Promise<string> {
    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        if (!response.ok) throw new Error(`Failed to read label image: ${response.status}`);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string'
                ? resolve(reader.result)
                : reject(new Error('Failed to encode label image'));
            reader.onerror = () => reject(reader.error ?? new Error('Failed to encode label image'));
            reader.readAsDataURL(blob);
        });
    }

    const directory = FileSystem.documentDirectory;
    if (!directory) throw new Error('Persistent storage is unavailable for label images');
    const folder = `${directory}food-labels/`;
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const destination = `${folder}${itemId}-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
}
