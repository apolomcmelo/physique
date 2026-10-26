import { FoodItem, FoodNutrient, NutrientValue } from '../../src/domain/entities/FoodItem';

function normalize(label: string): string {
    return label.toLocaleLowerCase('pt-BR').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getNutrientValue(item: FoodItem, aliases: string[]): NutrientValue | null {
    const accepted = new Set(aliases.map(normalize));
    const column = item.nutritionColumns[0];
    if (!column) return null;
    const nutrient = item.nutrients.find((row) => accepted.has(normalize(row.label)));
    return nutrient?.values.find((value) => value.columnId === column.id) ?? null;
}

export function formatNutrientValue(nutrient: FoodNutrient, value: NutrientValue): string {
    if (value.amount === null || value.certainty === 'unknown') return `${nutrient.label}: Desconhecido`;
    const amount = value.amount.toLocaleString('pt-BR');
    const unit = value.unit ? ` ${value.unit}` : '';
    const dailyValue = value.dailyValuePercent === null
        ? ''
        : ` (${value.dailyValuePercent.toLocaleString('pt-BR')}% VD)`;
    const uncertain = value.certainty === 'uncertain' ? ' [incerto]' : '';
    return `${nutrient.label}: ${amount}${unit}${dailyValue}${uncertain}`;
}

export function formatMacroLine(item: FoodItem): string {
    const format = (aliases: string[], label: string) => {
        const value = getNutrientValue(item, aliases);
        if (!value || value.amount === null || value.certainty === 'unknown') return `${label} —`;
        const unit = value.unit === 'kcal' ? ` ${value.unit}` : value.unit ?? '';
        return `${label} ${value.amount.toLocaleString('pt-BR')}${unit}`;
    };
    return [
        format(['Calorias', 'Valor energético'], 'Energia'),
        format(['Proteínas', 'Proteína'], 'P'),
        format(['Carboidratos', 'Carboidrato'], 'C'),
        format(['Gorduras totais', 'Gordura total'], 'G'),
    ].join(' • ');
}
