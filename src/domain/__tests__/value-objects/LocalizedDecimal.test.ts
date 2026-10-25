import { parseLocalizedDecimal } from '../../value-objects/LocalizedDecimal';

describe('parseLocalizedDecimal', () => {
    it.each([
        ['74,5', 74.5],
        ['74.5', 74.5],
        [' 0 ', 0],
        [',5', 0.5],
        ['.5', 0.5],
        ['-0,25', -0.25],
    ])('parses %s as %s', (input, expected) => {
        expect(parseLocalizedDecimal(input)).toBe(expected);
    });

    it.each([
        '',
        ' ',
        '74,5kg',
        '74,5.2',
        '74,,5',
        '1.234,5',
        '1,234.5',
        'Infinity',
        'NaN',
        '12,',
        '.',
    ])('rejects ambiguous or incomplete input %s', (input) => {
        expect(parseLocalizedDecimal(input)).toBeNull();
    });
});
