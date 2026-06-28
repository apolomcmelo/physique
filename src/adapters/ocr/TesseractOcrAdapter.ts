import { createWorker } from 'tesseract.js';

export interface OcrResult {
    rawText: string;
    nutritionData: Partial<{
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
        servingSizeGrams: number;
        ingredients: string;
    }>;
}

// ── Regex patterns (PT-BR and EN) ─────────────────────────────────────────────

const PATTERNS = {
    calories: [
        /calorias[^\d]*(\d+(?:[.,]\d+)?)/i,
        /energia[^\d]*(\d+(?:[.,]\d+)?)\s*kcal/i,
        /calories?[^\d]*(\d+(?:[.,]\d+)?)/i,
        /energy[^\d]*(\d+(?:[.,]\d+)?)\s*kcal/i,
        /valor\s+energ[eé]tico[^\d]*(\d+(?:[.,]\d+)?)/i,
    ],
    proteinGrams: [
        /prote[ií]nas?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /proteins?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
    ],
    carbsGrams: [
        /carboidratos?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /carbohydrates?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /total\s+carb[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /(?:a[cç][uú]cares?\s+totais?|total\s+sugars?)[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
    ],
    fatGrams: [
        /gorduras?\s+totais?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /total\s+fat[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /lipídios?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /fats?[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
    ],
    servingSizeGrams: [
        /por[çc][aã]o[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /serving\s+size[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /por[çc][aã]o\s+de[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
        /tamanho\s+da\s+por[çc][aã]o[^\d]*(\d+(?:[.,]\d+)?)\s*g/i,
    ],
    ingredients: [
        /ingredientes?[:\s]+([^.]+(?:\.[^.]+)*)/i,
        /ingredients?[:\s]+([^.]+(?:\.[^.]+)*)/i,
    ],
};

function parseFloat_PTBR(value: string): number {
    return parseFloat(value.replace(',', '.'));
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match?.[1]) {
            const value = parseFloat_PTBR(match[1]);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return undefined;
}

function extractIngredients(text: string): string | undefined {
    for (const pattern of PATTERNS.ingredients) {
        const match = pattern.exec(text);
        if (match?.[1]) {
            return match[1].trim().replace(/\s+/g, ' ');
        }
    }
    return undefined;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function recognizeNutritionLabel(imageUri: string): Promise<OcrResult> {
    const worker = await createWorker('por+eng');

    try {
        const { data } = await worker.recognize(imageUri);
        const rawText = data.text ?? '';

        const nutritionData: OcrResult['nutritionData'] = {};

        const calories = extractNumber(rawText, PATTERNS.calories);
        if (calories !== undefined) {
            nutritionData.calories = calories;
        }

        const proteinGrams = extractNumber(rawText, PATTERNS.proteinGrams);
        if (proteinGrams !== undefined) {
            nutritionData.proteinGrams = proteinGrams;
        }

        const carbsGrams = extractNumber(rawText, PATTERNS.carbsGrams);
        if (carbsGrams !== undefined) {
            nutritionData.carbsGrams = carbsGrams;
        }

        const fatGrams = extractNumber(rawText, PATTERNS.fatGrams);
        if (fatGrams !== undefined) {
            nutritionData.fatGrams = fatGrams;
        }

        const servingSizeGrams = extractNumber(rawText, PATTERNS.servingSizeGrams);
        if (servingSizeGrams !== undefined) {
            nutritionData.servingSizeGrams = servingSizeGrams;
        }

        const ingredients = extractIngredients(rawText);
        if (ingredients !== undefined) {
            nutritionData.ingredients = ingredients;
        }

        return { rawText, nutritionData };
    } finally {
        await worker.terminate();
    }
}
