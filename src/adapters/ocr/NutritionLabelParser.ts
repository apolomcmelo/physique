import {
    FoodNutrient,
    NutritionColumn,
    NutrientValue,
    createUnknownNutrientValue,
} from '../../domain/entities/FoodItem';
import { parseLocalizedDecimal } from '../../domain/value-objects/LocalizedDecimal';

export interface ParsedNutritionLabel {
    columns: NutritionColumn[];
    nutrients: FoodNutrient[];
    servingSizeGrams?: number;
    ingredients?: string;
}

const VALUE_PATTERN = /(?:^|[^\d.,])(\d+(?:[.,]\d+)?)(?![\d.,])\s*(kcal|kj|g|mg|µg|μg|mcg|ml|%)/ig;
const INGREDIENT_PATTERN = /(?:ingredientes?|ingredients?)[:\s]+([^\n]+)/i;
const BASIS_PATTERN = /(?:porção|portion|serving(?:\s+size)?)(?:\s*(?:de|of)?\s*\(?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s*\)?)?|(?:por|per)\s+(\d+(?:[.,]\d+)?)\s*(g|ml)/ig;

function parseColumns(text: string): NutritionColumn[] {
    const columns: NutritionColumn[] = [];
    for (const match of text.matchAll(BASIS_PATTERN)) {
        const amountText = match[1] ?? match[3] ?? null;
        const unit = (match[2] ?? match[4] ?? null)?.toLowerCase() ?? null;
        const amount = amountText === null ? null : parseLocalizedDecimal(amountText);
        const isServing = /porção|serving/i.test(match[0]);
        const label = isServing
            ? 'Porção'
            : amount === null
                ? 'Porção'
                : `Por ${amount.toLocaleString('pt-BR')} ${unit}`;
        if (!columns.some((column) => column.label === label && column.basisAmount === amount && column.basisUnit === unit)) {
            columns.push({
                id: `ocr-column-${columns.length + 1}`,
                label,
                basisAmount: amount,
                basisUnit: unit,
            });
        }
    }
    return columns.length > 0
        ? columns
        : [{ id: 'ocr-column-1', label: 'Rótulo', basisAmount: null, basisUnit: null }];
}

function parseLineValues(line: string): Array<{ amount: number; unit: string; dailyValuePercent: number | null }> {
    const parsed: Array<{ amount: number; unit: string; dailyValuePercent: number | null }> = [];
    for (const match of line.matchAll(VALUE_PATTERN)) {
        const amount = parseLocalizedDecimal(match[1]);
        const unit = match[2].toLowerCase() === 'μg' || match[2].toLowerCase() === 'mcg'
            ? 'µg'
            : match[2].toLowerCase();
        if (amount === null) continue;
        if (unit === '%') {
            const previous = parsed[parsed.length - 1];
            if (previous && previous.dailyValuePercent === null) previous.dailyValuePercent = amount;
        } else {
            parsed.push({ amount, unit, dailyValuePercent: null });
        }
    }
    return parsed;
}

function normalizeNutrientLabel(label: string): string {
    return label
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function parseNutrients(text: string, initialColumns: NutritionColumn[]): { columns: NutritionColumn[]; nutrients: FoodNutrient[] } {
    const columns = [...initialColumns];
    const nutrients: FoodNutrient[] = [];

    for (const line of text.split(/\r?\n/)) {
        const matches = [...line.matchAll(VALUE_PATTERN)];
        if (matches.length === 0) continue;
        const label = line.slice(0, matches[0].index).replace(/^[\s•*:-]+|[\s:]+$/g, '').trim();
        const normalizedLabel = normalizeNutrientLabel(label);
        if (!label || /^(porcao|portion|serving size|por)$/.test(normalizedLabel)) continue;
        const values = parseLineValues(line);
        if (values.length === 0) continue;

        if (columns.length === 1 && columns[0].label === 'Rótulo' && values.length > 1) {
            columns[0] = { ...columns[0], label: 'Coluna 1' };
            for (let index = 1; index < values.length; index += 1) {
                columns.push({
                    id: `ocr-column-${columns.length + 1}`,
                    label: `Coluna ${columns.length + 1}`,
                    basisAmount: null,
                    basisUnit: null,
                });
            }
        } else if (values.length > columns.length) {
            for (let index = columns.length; index < values.length; index += 1) {
                columns.push({
                    id: `ocr-column-${columns.length + 1}`,
                    label: `Coluna ${columns.length + 1}`,
                    basisAmount: null,
                    basisUnit: null,
                });
            }
        }

        const ambiguousAlignment = columns.length > 1 && values.length < columns.length;
        const nutrientValues: NutrientValue[] = columns.map((column, index) => {
            const value = ambiguousAlignment ? undefined : values[index];
            return value
                ? {
                    columnId: column.id,
                    amount: value.amount,
                    unit: value.unit,
                    dailyValuePercent: value.dailyValuePercent,
                    certainty: 'uncertain',
                    origin: 'label',
                }
                : createUnknownNutrientValue(column.id);
        });
        nutrients.push({
            id: `ocr-nutrient-${nutrients.length + 1}`,
            label,
            values: nutrientValues,
        });
    }
    return { columns, nutrients };
}

export function parseNutritionLabelText(text: string): ParsedNutritionLabel {
    const columns = parseColumns(text);
    const parsed = parseNutrients(text, columns);
    const ingredientMatch = INGREDIENT_PATTERN.exec(text);
    const servingSizeGrams = parsed.columns.find((column) =>
        /porção|serving/i.test(column.label) && column.basisUnit === 'g')?.basisAmount ?? undefined;
    return {
        ...parsed,
        ...(servingSizeGrams !== undefined ? { servingSizeGrams } : {}),
        ...(ingredientMatch?.[1] ? { ingredients: ingredientMatch[1].trim() } : {}),
    };
}

export function findFirstNutrientValue(
    parsed: ParsedNutritionLabel,
    labels: string[],
): number | undefined {
    const accepted = new Set(labels.map(normalizeNutrientLabel));
    const row = parsed.nutrients.find((nutrient) => accepted.has(normalizeNutrientLabel(nutrient.label)));
    return row?.values.find((value) => value.amount !== null)?.amount ?? undefined;
}
