import { FoodItem } from '../../src/domain/entities/FoodItem';

export function formatMacroLine(item: FoodItem): string {
    return `${item.calories} kcal • P ${item.proteinGrams}g • C ${item.carbsGrams}g • G ${item.fatGrams}g`;
}
