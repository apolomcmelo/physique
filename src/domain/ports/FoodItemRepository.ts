import { FoodItem } from '../entities/FoodItem';

export interface IFoodItemRepository {
    getFoodItems(): Promise<FoodItem[]>;
    saveFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem>;
    updateFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem>;
    getFoodItemById(id: string): Promise<FoodItem | null>;
    getOriginalImageUrl(path: string): Promise<string | null>;
}
