import { createUser, calculateAge } from '../../entities/User';

const DOB_30_YEARS_AGO = new Date(new Date().getFullYear() - 30, 0, 1);

const validParams = {
    name: 'John Doe',
    dateOfBirth: DOB_30_YEARS_AGO,
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
        expect(calculateAge(user.dateOfBirth)).toBe(30);
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

    it('throws if dateOfBirth is invalid', () => {
        expect(() => createUser({ ...validParams, dateOfBirth: new Date('invalid') })).toThrow(
            'Date of birth must be a valid date',
        );
    });

    it('throws if dateOfBirth is in the future', () => {
        const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
        expect(() => createUser({ ...validParams, dateOfBirth: future })).toThrow(
            'Date of birth cannot be in the future',
        );
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

describe('calculateAge', () => {
    it('returns correct age when birthday has already passed this year', () => {
        const ref = new Date(2026, 5, 15); // 15 Jun 2026
        const dob = new Date(1994, 2, 10); // 10 Mar 1994
        expect(calculateAge(dob, ref)).toBe(32);
    });

    it('returns correct age when birthday has not yet occurred this year', () => {
        const ref = new Date(2026, 1, 1); // 1 Feb 2026
        const dob = new Date(1994, 5, 15); // 15 Jun 1994
        expect(calculateAge(dob, ref)).toBe(31);
    });

    it('returns correct age on the exact birthday', () => {
        const ref = new Date(2026, 5, 15);
        const dob = new Date(1994, 5, 15);
        expect(calculateAge(dob, ref)).toBe(32);
    });

    it('returns 0 for a newborn (same day)', () => {
        const now = new Date();
        expect(calculateAge(now, now)).toBe(0);
    });

    it('throws for an invalid date', () => {
        expect(() => calculateAge(new Date('not-a-date'))).toThrow('Date of birth must be a valid date');
    });
});
