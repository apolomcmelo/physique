import { generateNewPlanPrompt } from '../../use-cases/prompt/GenerateNewPlanPrompt';
import { mockUser } from '../setup';

describe('generateNewPlanPrompt', () => {
    const result = generateNewPlanPrompt(mockUser, [], [], []);

    it('returns a non-empty string', () => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it("contains user's name in the output", () => {
        expect(result).toContain(mockUser.name);
    });

    it("contains user's current weight in the output", () => {
        expect(result).toContain(String(mockUser.currentWeight));
    });

    it("contains user's goal weight in the output", () => {
        expect(result).toContain(String(mockUser.goalWeight));
    });

    it("contains user's objective in the output", () => {
        expect(result).toContain(mockUser.objective);
    });
});
