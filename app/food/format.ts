import { FoodItem } from '../../src/domain/entities/FoodItem';

export function formatMacroLine(item: FoodItem): string {
    return `${item.calories.toLocaleString('pt-BR')} kcal • P ${item.proteinGrams.toLocaleString('pt-BR')}g • C ${item.carbsGrams.toLocaleString('pt-BR')}g • G ${item.fatGrams.toLocaleString('pt-BR')}g`;
}
