import {
    formatDateOfBirthDisplay,
    formatDateOfBirthInput,
    parseDateOfBirthInput,
} from '../../use-cases/user/DateOfBirthInput';

describe('DateOfBirthInput', () => {
    it('auto-formats partial numeric input as DD/MM/AAAA', () => {
        expect(formatDateOfBirthInput('1')).toBe('1');
        expect(formatDateOfBirthInput('1207')).toBe('12/07');
        expect(formatDateOfBirthInput('12071990')).toBe('12/07/1990');
    });

    it('ignores non-digit characters and limits the value to eight digits', () => {
        expect(formatDateOfBirthInput('12/07/1990')).toBe('12/07/1990');
        expect(formatDateOfBirthInput('12a07b1990123')).toBe('12/07/1990');
    });

    it('parses both formatted and numeric-only input', () => {
        const referenceDate = new Date(2026, 6, 7);

        expect(parseDateOfBirthInput('12071990', referenceDate)).toEqual(new Date(1990, 6, 12));
        expect(parseDateOfBirthInput('12/07/1990', referenceDate)).toEqual(new Date(1990, 6, 12));
    });

    it('rejects incomplete, impossible, or non-past dates', () => {
        const referenceDate = new Date(2026, 6, 7);

        expect(parseDateOfBirthInput('120719', referenceDate)).toBeNull();
        expect(parseDateOfBirthInput('31/02/2020', referenceDate)).toBeNull();
        expect(parseDateOfBirthInput('07/07/2026', referenceDate)).toBeNull();
        expect(parseDateOfBirthInput('08/07/2026', referenceDate)).toBeNull();
    });

    it('formats stored dates back to DD/MM/AAAA', () => {
        expect(formatDateOfBirthDisplay(new Date(1990, 6, 12))).toBe('12/07/1990');
    });
});