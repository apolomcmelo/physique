import { createWeight } from '../../value-objects/Weight';

describe('createWeight', () => {
    it('returns { kg: 65, display: "65.0kg" } for input 65', () => {
        const weight = createWeight(65);
        expect(weight.kg).toBe(65);
        expect(weight.display).toBe('65.0kg');
    });

    it('returns { kg: 65.5, display: "65.5kg" } for input 65.5', () => {
        const weight = createWeight(65.5);
        expect(weight.kg).toBe(65.5);
        expect(weight.display).toBe('65.5kg');
    });

    it('throws if weight is 0', () => {
        expect(() => createWeight(0)).toThrow();
    });

    it('throws if weight is negative', () => {
        expect(() => createWeight(-5)).toThrow();
    });

    it('throws if weight is NaN', () => {
        expect(() => createWeight(NaN)).toThrow();
    });
});
