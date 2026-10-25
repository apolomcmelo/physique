import { formatMealDateInput, formatMealTimeInput, parseMealDateTime } from '../../use-cases/meal/MealConsumptionInput';

describe('meal consumption date input', () => {
    it('formats and parses local dates and times without changing the instant components', () => {
        const original = new Date(2026, 9, 25, 8, 7);
        const date = formatMealDateInput(original);
        const time = formatMealTimeInput(original);
        expect(date).toBe('25/10/2026');
        expect(time).toBe('08:07');
        expect(parseMealDateTime(date, time)?.getTime()).toBe(original.getTime());
    });

    it.each([
        ['31/02/2026', '12:00'],
        ['1/02/2026', '12:00'],
        ['25/10/2026', '24:00'],
        ['25/10/2026', '12:60'],
    ])('rejects invalid or ambiguous input %s %s', (date, time) => {
        expect(parseMealDateTime(date, time)).toBeNull();
    });
});
