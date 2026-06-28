import { createUser } from '../../entities/User';

const validParams = {
    name: 'John Doe',
    age: 30,
    height: 180,
    currentWeight: 80,
    goalWeight: 75,
    bodyFatPercentage: 15,
    proteinPercentage: 20,
    objective: 'Lose weight and build muscle',
};

describe('createUser', () => {
    it('creates a valid user with all fields', () => {
        const user = createUser(validParams);
        expect(user.name).toBe('John Doe');
        expect(user.age).toBe(30);
        expect(user.height).toBe(180);
        expect(user.currentWeight).toBe(80);
        expect(user.goalWeight).toBe(75);
        expect(user.bodyFatPercentage).toBe(15);
        expect(user.proteinPercentage).toBe(20);
        expect(user.objective).toBe('Lose weight and build muscle');
    });

    it('throws if name is empty string', () => {
        expect(() => createUser({ ...validParams, name: '' })).toThrow('User name is required');
    });

    it('throws if age <= 0', () => {
        expect(() => createUser({ ...validParams, age: 0 })).toThrow('Age must be greater than 0');
        expect(() => createUser({ ...validParams, age: -1 })).toThrow('Age must be greater than 0');
    });

    it('throws if height <= 0', () => {
        expect(() => createUser({ ...validParams, height: 0 })).toThrow(
            'Height must be greater than 0',
        );
        expect(() => createUser({ ...validParams, height: -10 })).toThrow(
            'Height must be greater than 0',
        );
    });

    it('throws if currentWeight <= 0', () => {
        expect(() => createUser({ ...validParams, currentWeight: 0 })).toThrow(
            'Current weight must be greater than 0',
        );
        expect(() => createUser({ ...validParams, currentWeight: -5 })).toThrow(
            'Current weight must be greater than 0',
        );
    });

    it('throws if goalWeight <= 0', () => {
        expect(() => createUser({ ...validParams, goalWeight: 0 })).toThrow(
            'Goal weight must be greater than 0',
        );
        expect(() => createUser({ ...validParams, goalWeight: -5 })).toThrow(
            'Goal weight must be greater than 0',
        );
    });

    it('generates a unique id', () => {
        const user1 = createUser(validParams);
        const user2 = createUser(validParams);
        expect(user1.id).toBeDefined();
        expect(user2.id).toBeDefined();
        expect(user1.id).not.toBe(user2.id);
    });

    it('sets createdAt and updatedAt to current date', () => {
        const before = new Date();
        const user = createUser(validParams);
        const after = new Date();
        expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(user.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
});
