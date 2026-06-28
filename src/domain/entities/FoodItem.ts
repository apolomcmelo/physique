import { generateId } from '../value-objects/UUID';

export interface FoodItem {
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
    createdAt: Date;
}

export type CreateFoodItemParams = Omit<FoodItem, 'id' | 'createdAt'>;

export function createFoodItem(params: CreateFoodItemParams): FoodItem {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('Food item name is required');
    }
    if (params.servingSizeGrams <= 0) {
        throw new Error('Serving size must be greater than 0');
    }
    if (params.calories < 0) {
        throw new Error('Calories cannot be negative');
    }
    if (params.proteinGrams < 0) {
        throw new Error('Protein grams cannot be negative');
    }
    if (params.carbsGrams < 0) {
        throw new Error('Carbs grams cannot be negative');
    }
    if (params.fatGrams < 0) {
        throw new Error('Fat grams cannot be negative');
    }
    return {
        ...params,
        id: generateId(),
        createdAt: new Date(),
    };
}
