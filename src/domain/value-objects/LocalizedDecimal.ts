export function parseLocalizedDecimal(input: string): number | null {
    const value = input.trim();
    if (!value || !/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(value)) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}
