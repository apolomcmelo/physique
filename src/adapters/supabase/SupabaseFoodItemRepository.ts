import { FoodItem, FoodNutrient, NutritionColumn } from '../../domain/entities/FoodItem';
import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';
import { readFileAsArrayBuffer } from '../../infrastructure/supabase/readFileAsArrayBuffer';
import { supabase } from '../../infrastructure/supabase/client';
import { requireAuthUserId } from './currentAuthUser';

interface FoodNutritionData {
    columns: NutritionColumn[];
    nutrients: FoodNutrient[];
}

interface FoodItemRow {
    id: string;
    name: string;
    brand_or_source: string | null;
    serving_size_grams: number | null;
    calories: number | null;
    protein_grams: number | null;
    carbs_grams: number | null;
    fat_grams: number | null;
    ingredients: string | null;
    raw_ocr_text: string | null;
    nutrition_data?: FoodNutritionData;
    original_image_path?: string | null;
    available_for_planning?: boolean;
    created_at: string;
}

function legacyNutrition(row: FoodItemRow): FoodNutritionData {
    const column: NutritionColumn = {
        id: 'serving',
        label: 'Porção',
        basisAmount: row.serving_size_grams,
        basisUnit: row.serving_size_grams === null ? null : 'g',
    };
    const rows: Array<[string, string, number | null, string]> = [
        ['energy', 'Calorias', row.calories, 'kcal'],
        ['protein', 'Proteínas', row.protein_grams, 'g'],
        ['carbohydrates', 'Carboidratos', row.carbs_grams, 'g'],
        ['total-fat', 'Gorduras totais', row.fat_grams, 'g'],
    ];
    return {
        columns: [column],
        nutrients: rows.map(([id, label, amount, unit]) => ({
            id,
            label,
            values: [{
                columnId: column.id,
                amount,
                unit: amount === null ? null : unit,
                dailyValuePercent: null,
                certainty: amount === null ? 'unknown' : 'confirmed',
                origin: 'label',
            }],
        })),
    };
}

function rowToFoodItem(row: FoodItemRow): FoodItem {
    const nutrition = row.nutrition_data ?? legacyNutrition(row);
    return {
        id: row.id,
        name: row.name,
        brandOrSource: row.brand_or_source,
        nutritionColumns: nutrition.columns,
        nutrients: nutrition.nutrients,
        ingredients: row.ingredients,
        rawOcrText: row.raw_ocr_text,
        originalImagePath: row.original_image_path ?? null,
        availableForPlanning: row.available_for_planning ?? true,
        createdAt: new Date(row.created_at),
    };
}

function firstLegacyNutrientAmount(item: FoodItem, aliases: string[], expectedUnit: string): number | null {
    const normalize = (value: string) => value.toLocaleLowerCase('pt-BR')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const accepted = new Set(aliases.map(normalize));
    const firstColumn = item.nutritionColumns[0];
    if (!firstColumn || firstColumn.basisUnit?.toLowerCase() !== 'g') return null;
    const row = item.nutrients.find((nutrient) => accepted.has(normalize(nutrient.label)));
    const value = row?.values.find((candidate) => candidate.columnId === firstColumn.id);
    if (value?.certainty !== 'confirmed' || value.unit?.toLowerCase() !== expectedUnit) return null;
    return value.amount;
}

function foodItemToRow(item: FoodItem, originalImagePath: string | null): Omit<FoodItemRow, 'created_at'> {
    const firstColumn = item.nutritionColumns[0] ?? null;
    return {
        id: item.id,
        name: item.name,
        brand_or_source: item.brandOrSource,
        serving_size_grams: firstColumn?.basisUnit?.toLowerCase() === 'g' ? firstColumn.basisAmount : null,
        calories: firstLegacyNutrientAmount(item, ['Calorias', 'Valor energético'], 'kcal'),
        protein_grams: firstLegacyNutrientAmount(item, ['Proteínas', 'Proteína'], 'g'),
        carbs_grams: firstLegacyNutrientAmount(item, ['Carboidratos', 'Carboidrato'], 'g'),
        fat_grams: firstLegacyNutrientAmount(item, ['Gorduras totais', 'Gordura total'], 'g'),
        ingredients: item.ingredients,
        raw_ocr_text: item.rawOcrText,
        nutrition_data: { columns: item.nutritionColumns, nutrients: item.nutrients },
        original_image_path: originalImagePath,
        available_for_planning: item.availableForPlanning,
    };
}

async function uploadOriginalImage(item: FoodItem, uri: string, userId: string): Promise<string> {
    const path = `${userId}/${item.id}.jpg`;
    const body = await readFileAsArrayBuffer(uri);
    const { error } = await supabase.storage.from('food-labels').upload(path, body, {
        contentType: 'image/jpeg',
        upsert: true,
    });
    if (error) throw new Error(`Failed to upload food label image: ${error.message}`);
    return path;
}

export class SupabaseFoodItemRepository implements IFoodItemRepository {
    async getFoodItems(): Promise<FoodItem[]> {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to get food items: ${error.message}`);
        return (data as FoodItemRow[]).map(rowToFoodItem);
    }

    async saveFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem> {
        const userId = await requireAuthUserId();
        const originalImagePath = originalImageUri
            ? await uploadOriginalImage(item, originalImageUri, userId)
            : item.originalImagePath;
        const { error } = await supabase
            .from('food_items')
            .insert({ ...foodItemToRow(item, originalImagePath), created_at: item.createdAt.toISOString(), user_id: userId });
        if (error) {
            if (originalImageUri && originalImagePath) {
                const { error: cleanupError } = await supabase.storage.from('food-labels').remove([originalImagePath]);
                if (cleanupError) {
                    throw new Error(`Failed to save food item: ${error.message}; label-image cleanup also failed: ${cleanupError.message}`);
                }
            }
            throw new Error(`Failed to save food item: ${error.message}`);
        }
        return { ...item, originalImagePath };
    }

    async updateFoodItem(item: FoodItem, originalImageUri?: string): Promise<FoodItem> {
        const userId = await requireAuthUserId();
        const originalImagePath = originalImageUri
            ? await uploadOriginalImage(item, originalImageUri, userId)
            : item.originalImagePath;
        const { data, error } = await supabase
            .from('food_items')
            .update(foodItemToRow(item, originalImagePath))
            .eq('id', item.id)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();
        if (error) throw new Error(`Failed to update food item: ${error.message}`);
        if (!data) throw new Error('Failed to update food item: record not found or not owned by current user');
        return { ...item, originalImagePath };
    }

    async getFoodItemById(id: string): Promise<FoodItem | null> {
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw new Error(`Failed to get food item by id: ${error.message}`);
        return data ? rowToFoodItem(data as FoodItemRow) : null;
    }

    async getOriginalImageUrl(path: string): Promise<string | null> {
        const { data, error } = await supabase.storage.from('food-labels').createSignedUrl(path, 60);
        if (error) throw new Error(`Failed to open food label image: ${error.message}`);
        return data.signedUrl;
    }
}
