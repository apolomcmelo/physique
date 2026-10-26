import { formatWeightDateInput, formatWeightTimeInput, parseWeightDateTimeInput } from '../../use-cases/weight/WeightRecordInput';

describe('WeightRecordInput', () => {
    it('formats and parses local calendar dates and times', () => {
        const input = new Date(2026, 9, 25, 9, 5);
        expect(formatWeightDateInput(input)).toBe('25/10/2026');
        expect(formatWeightTimeInput(input)).toBe('09:05');
        expect(parseWeightDateTimeInput('25/10/2026', '09:05')).toEqual(input);
    });

    it.each([
        ['31/02/2026', '12:00'],
        ['25/10/2026', '24:00'],
        ['25/10/2026', '09:60'],
        ['2026-10-25', '09:00'],
    ])('rejects invalid date/time %s %s', (date, time) => {
        expect(parseWeightDateTimeInput(date, time)).toBeNull();
    });
});
