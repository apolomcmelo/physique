import { FoodItem } from '../entities/FoodItem';

export interface IFoodItemRepository {
    getFoodItems(): Promise<FoodItem[]>;
    saveFoodItem(item: FoodItem): Promise<void>;
    getFoodItemById(id: string): Promise<FoodItem | null>;
}
