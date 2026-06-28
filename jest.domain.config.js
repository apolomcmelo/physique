/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/domain/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: false } }],
    },
};
