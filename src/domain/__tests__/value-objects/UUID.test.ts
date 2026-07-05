import { generateId, isValidId } from '../../value-objects/UUID';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateId', () => {
    it('returns a valid UUID v4 string', () => {
        const id = generateId();
        expect(UUID_V4_REGEX.test(id)).toBe(true);
    });

    it('returns unique IDs on consecutive calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });

    it('has the version nibble set to 4', () => {
        const id = generateId();
        expect(id[14]).toBe('4');
    });

    it('has the variant bits set correctly (8, 9, a, or b)', () => {
        const id = generateId();
        expect(['8', '9', 'a', 'b']).toContain(id[19]);
    });
});

describe('isValidId', () => {
    it('returns true for a non-empty string', () => {
        expect(isValidId('some-id')).toBe(true);
    });

    it('returns true for a generated UUID', () => {
        expect(isValidId(generateId())).toBe(true);
    });

    it('returns false for an empty string', () => {
        expect(isValidId('')).toBe(false);
    });

    it('returns false for a whitespace-only string', () => {
        expect(isValidId('   ')).toBe(false);
    });
});
