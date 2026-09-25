import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';


const mockSaveMeals = jest.fn();
const mockSaveWorkout = jest.fn();
const mockParseWorkouts = jest.fn();
const mockGetDocument = jest.fn();
const mockSaveImport = jest.fn();
const mockSaveLocalImport = jest.fn();
jest.mock('../../src/adapters/supabase/SavePlanImport', () => ({ savePlanImport: (...args: unknown[]) => mockSaveImport(...args) }));
jest.mock('../../src/adapters/local/SavePlanImport', () => ({ saveLocalPlanImport: (...args: unknown[]) => mockSaveLocalImport(...args) }));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...args: unknown[]) => mockGetDocument(...args) }));
jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn(async () => 'csv') }));
jest.mock('../../src/domain/use-cases/meal/ParseCsvMealPlan', () => ({ parseCsvMealPlan: () => [{ id: 'meal-1' }] }));
jest.mock('../../src/domain/use-cases/workout/ParseCsvWorkouts', () => ({ parseCsvWorkouts: (...args: unknown[]) => mockParseWorkouts(...args) }));
jest.mock('../../src/ui/hooks/useSupabase', () => ({
    useRepositories: () => ({
        mealRepo: { getMealPlanEntries: jest.fn(async () => []), saveMealPlanEntries: mockSaveMeals },
        workoutRepo: { getWorkouts: jest.fn(async () => []), saveWorkout: mockSaveWorkout },
    }),
}));

const PlanScreen = require('../(tabs)/plan').default;

it('does not write any meals when the workout portion of the CSV is invalid', async () => {
    mockSaveMeals.mockClear();
    mockSaveWorkout.mockClear();
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockParseWorkouts.mockImplementation(() => { throw new Error('invalid workout'); });
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText(/invalid workout/));
    expect(mockSaveMeals).not.toHaveBeenCalled();
    expect(mockSaveWorkout).not.toHaveBeenCalled();
});

it('does not leave half an import when saving workouts fails', async () => {
    mockSaveMeals.mockClear();
    mockSaveWorkout.mockClear();
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockParseWorkouts.mockReturnValue([{ id: 'workout-1' }]);
    mockSaveImport.mockRejectedValue(new Error('network failure'));
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText(/network failure/));
    expect(mockSaveMeals).not.toHaveBeenCalled();
    expect(mockSaveWorkout).not.toHaveBeenCalled();
});
