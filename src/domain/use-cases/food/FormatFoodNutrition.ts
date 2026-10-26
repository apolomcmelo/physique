import { derivePer100g, FoodItem } from '../../entities/FoodItem';

function formatValue(amount: number | null, unit: string | null): string {
    return amount === null ? 'unknown' : `${amount} ${unit ?? 'unit unknown'}`;
}

export function formatFoodNutritionForPrompt(item: FoodItem): string {
    const columns = new Map(item.nutritionColumns.map((column) => [column.id, column]));
    const rows = item.nutrients.map((nutrient) => {
        const values = nutrient.values.map((value) => {
            const column = columns.get(value.columnId);
            const basis = column
                ? `${column.label}${column.basisAmount !== null && column.basisUnit
                    ? ` (${column.basisAmount} ${column.basisUnit})`
                    : ''}`
                : 'basis unknown';
            const dailyValue = value.dailyValuePercent === null
                ? ''
                : `, ${value.dailyValuePercent}% daily value`;
            const certainty = value.certainty === 'uncertain' ? ', OCR uncertain' : '';
            return `${formatValue(value.amount, value.unit)}${dailyValue}${certainty} per ${basis}`;
        });
        const derived = derivePer100g(nutrient, item.nutritionColumns);
        if (derived) {
            const certainty = derived.certainty === 'uncertain' ? ', OCR uncertain' : '';
            values.push(`${formatValue(derived.amount, derived.unit)}${certainty}, calculated per 100 g`);
        }
        return `  - ${nutrient.label}: ${values.join('; ') || 'unknown'}`;
    });
    return [
        `- ${item.name}${item.brandOrSource ? ` (${item.brandOrSource})` : ''}`,
        ...(item.ingredients ? [`  Ingredients: ${item.ingredients}`] : []),
        ...(rows.length ? rows : ['  Nutritional table: unknown']),
    ].join('\n');
}
