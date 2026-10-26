import { createWorker } from 'tesseract.js';
import { FoodNutrient, NutritionColumn } from '../../domain/entities/FoodItem';
import { findFirstNutrientValue, parseNutritionLabelText } from './NutritionLabelParser';

export interface OcrResult {
    rawText: string;
    columns: NutritionColumn[];
    nutrients: FoodNutrient[];
    nutritionData: Partial<{
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
        servingSizeGrams: number;
        ingredients: string;
    }>;
}

export async function recognizeNutritionLabel(imageUri: string): Promise<OcrResult> {
    const worker = await createWorker('por+eng');

    try {
        const { data } = await worker.recognize(imageUri);
        const rawText = data.text ?? '';
        const parsed = parseNutritionLabelText(rawText);
        const nutritionData: OcrResult['nutritionData'] = {};

        const legacyFields: Array<[keyof OcrResult['nutritionData'], string[]]> = [
            ['calories', ['Calorias', 'Valor energético', 'Energia', 'Calories', 'Energy']],
            ['proteinGrams', ['Proteínas', 'Proteína', 'Protein']],
            ['carbsGrams', ['Carboidratos', 'Carboidrato', 'Carbohydrates', 'Total carbs']],
            ['fatGrams', ['Gorduras totais', 'Gordura total', 'Total fat', 'Lipídios']],
        ];
        for (const [field, labels] of legacyFields) {
            const value = findFirstNutrientValue(parsed, labels);
            if (value !== undefined) Object.assign(nutritionData, { [field]: value });
        }
        if (parsed.servingSizeGrams !== undefined) nutritionData.servingSizeGrams = parsed.servingSizeGrams;
        if (parsed.ingredients !== undefined) nutritionData.ingredients = parsed.ingredients;

        return {
            rawText,
            columns: parsed.columns,
            nutrients: parsed.nutrients,
            nutritionData,
        };
    } finally {
        await worker.terminate();
    }
}
