import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';
import { FoodItem } from '../../domain/entities/FoodItem';
import { supabase } from '../../infrastructure/supabase/client';

interface FoodItemRow {
    id: string;
    name: string;
    brand_or_source: string | null;
    serving_size_grams: number;
    calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
    ingredients: string | null;
    raw_ocr_text: string | null;
    created_at: string;
}

function rowToFoodItem(row: FoodItemRow): FoodItem {
    return {
        id: row.id,
        name: row.name,
        brandOrSource: row.brand_or_source,
        servingSizeGrams: row.serving_size_grams,
        calories: row.calories,
        proteinGrams: row.protein_grams,
        carbsGrams: row.carbs_grams,
        fatGrams: row.fat_grams,
        ingredients: row.ingredients,
        rawOcrText: row.raw_ocr_text,
        createdAt: new Date(row.created_at),
    };
}

function foodItemToRow(item: FoodItem): FoodItemRow {
    return {
        id: item.id,
        name: item.name,
        brand_or_source: item.brandOrSource,
        serving_size_grams: item.servingSizeGrams,
        calories: item.calories,
        protein_grams: item.proteinGrams,
        carbs_grams: item.carbsGrams,
        fat_grams: item.fatGrams,
        ingredients: item.ingredients,
        raw_ocr_text: item.rawOcrText,
        created_at: item.createdAt.toISOString(),
    };
}

export class SupabaseFoodItemRepository implements IFoodItemRepository {
    async getFoodItems(): Promise<FoodItem[]> {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get food items: ${error.message}`);
        }

        return (data as FoodItemRow[]).map(rowToFoodItem);
    }

    async saveFoodItem(item: FoodItem): Promise<void> {
        const { error } = await supabase.from('food_items').insert(foodItemToRow(item));

        if (error) {
            throw new Error(`Failed to save food item: ${error.message}`);
        }
    }

    async getFoodItemById(id: string): Promise<FoodItem | null> {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get food item by id: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return rowToFoodItem(data as FoodItemRow);
    }
}
