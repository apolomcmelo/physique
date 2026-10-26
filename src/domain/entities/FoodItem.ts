import { generateId } from '../value-objects/UUID';

export type NutrientCertainty = 'confirmed' | 'uncertain' | 'unknown';
export type NutrientOrigin = 'label' | 'manual' | 'derived';

export interface NutritionColumn {
    id: string;
    label: string;
    basisAmount: number | null;
    basisUnit: string | null;
}

export interface NutrientValue {
    columnId: string;
    amount: number | null;
    unit: string | null;
    dailyValuePercent: number | null;
    certainty: NutrientCertainty;
    origin: NutrientOrigin;
}

export interface FoodNutrient {
    id: string;
    label: string;
    values: NutrientValue[];
}

export interface FoodItem {
    id: string;
    name: string;
    brandOrSource: string | null;
    nutritionColumns: NutritionColumn[];
    nutrients: FoodNutrient[];
    ingredients: string | null;
    rawOcrText: string | null;
    originalImagePath: string | null;
    availableForPlanning: boolean;
    createdAt: Date;
}

export type CreateFoodItemParams = Omit<FoodItem, 'id' | 'createdAt'>;

export function createFoodItem(params: CreateFoodItemParams): FoodItem {
    if (!params.name || params.name.trim().length === 0) {
        throw new Error('Food item name is required');
    }
    if (params.nutritionColumns.length === 0) {
        throw new Error('At least one nutrition basis is required');
    }

    const columnIds = new Set<string>();
    for (const column of params.nutritionColumns) {
        if (!column.id.trim() || columnIds.has(column.id)) {
            throw new Error('Nutrition basis IDs must be non-empty and unique');
        }
        if (!column.label.trim()) throw new Error('Nutrition basis label is required');
        if ((column.basisAmount === null) !== (column.basisUnit === null)) {
            throw new Error('Nutrition basis amount and unit must both be provided or both be unknown');
        }
        if (column.basisAmount !== null && (!Number.isFinite(column.basisAmount) || column.basisAmount <= 0)) {
            throw new Error('Nutrition basis amount must be greater than 0');
        }
        columnIds.add(column.id);
    }

    const nutrientIds = new Set<string>();
    for (const nutrient of params.nutrients) {
        if (!nutrient.id.trim() || nutrientIds.has(nutrient.id)) {
            throw new Error('Nutrient IDs must be non-empty and unique');
        }
        if (!nutrient.label.trim()) throw new Error('Nutrient label is required');
        nutrientIds.add(nutrient.id);
        for (const value of nutrient.values) {
            if (!columnIds.has(value.columnId)) throw new Error('Nutrient value refers to an unknown basis');
            if (value.amount !== null && (!Number.isFinite(value.amount) || value.amount < 0)) {
                throw new Error('Nutrient value cannot be negative or non-finite');
            }
            if (value.certainty === 'unknown' && value.amount !== null) {
                throw new Error('Unknown nutrient values cannot contain an amount');
            }
            if (value.dailyValuePercent !== null
                && (!Number.isFinite(value.dailyValuePercent) || value.dailyValuePercent < 0)) {
                throw new Error('Daily value percentage cannot be negative or non-finite');
            }
        }
    }

    return {
        ...params,
        id: generateId(),
        createdAt: new Date(),
    };
}

export function createUnknownNutrientValue(columnId: string): NutrientValue {
    return {
        columnId,
        amount: null,
        unit: null,
        dailyValuePercent: null,
        certainty: 'unknown',
        origin: 'manual',
    };
}

export function derivePer100g(
    nutrient: FoodNutrient,
    columns: NutritionColumn[],
): NutrientValue | null {
    const source = nutrient.values.find((value) => {
        const column = columns.find((candidate) => candidate.id === value.columnId);
        return value.amount !== null && column?.basisUnit?.toLowerCase() === 'g'
            && column.basisAmount !== null && column.basisAmount > 0;
    });
    if (!source) return null;
    const column = columns.find((candidate) => candidate.id === source.columnId)!;
    if (column.basisAmount === 100) return null;
    return {
        ...source,
        columnId: 'derived-per-100g',
        amount: source.amount! * 100 / column.basisAmount!,
        dailyValuePercent: null,
        certainty: source.certainty,
        origin: 'derived',
    };
}
