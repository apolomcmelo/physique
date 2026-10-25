import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MealConsumption } from '../../src/domain/entities/MealConsumption';


const mockSaveMeals = jest.fn();
const mockSaveMealConsumption = jest.fn<Promise<void>, [MealConsumption]>(async () => {});
const mockGetMealConsumptions = jest.fn(async () => []);
const mockGetPlannedMeals = jest.fn(async () => [{
    id: 'meal-1', day: 'Domingo', time: '12:00', activity: 'Almoço',
    description: 'Arroz e feijão', biologicalObjective: 'Energia',
}]);
const mockSaveWorkout = jest.fn();
const mockParseWorkouts = jest.fn();
const mockGetDocument = jest.fn();
const mockSaveImport = jest.fn();
const mockSaveLocalImport = jest.fn();
const mockReadRoutineCsv = jest.fn((_csv: string) => [{ line: 2, day: 'Segunda-feira', time: '07:00', activity: 'Café', description: 'Ovos', focus: 'Energia' }]);
const mockValidateRoutineCsv = jest.fn();
const mockGetRoutineState = jest.fn(async () => ({ active: null, pending: null }));
const mockConfirmRoutine = jest.fn(async () => ({ active: null, pending: null }));
const mockGetUser = jest.fn(async () => ({ timezone: 'UTC' }));
jest.mock('../../src/adapters/supabase/SavePlanImport', () => ({ savePlanImport: (...args: unknown[]) => mockSaveImport(...args) }));
jest.mock('../../src/adapters/local/SavePlanImport', () => ({ saveLocalPlanImport: (...args: unknown[]) => mockSaveLocalImport(...args) }));
jest.mock('../../src/domain/use-cases/routine/ReadRoutineCsv', () => ({ readRoutineCsv: (csv: string) => mockReadRoutineCsv(csv) }));
jest.mock('../../src/domain/use-cases/routine/ValidateRoutineCsv', () => ({ validateRoutineCsv: (csv: string) => mockValidateRoutineCsv(csv) }));
jest.mock('../../src/adapters/local/LocalRoutineRepository', () => ({ LocalRoutineRepository: class { getState = mockGetRoutineState; confirm = mockConfirmRoutine; } }));
jest.mock('../../src/adapters/supabase/SupabaseRoutineRepository', () => ({ SupabaseRoutineRepository: class { getState = mockGetRoutineState; confirm = mockConfirmRoutine; } }));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: (...args: unknown[]) => mockGetDocument(...args) }));
jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn(async () => 'csv') }));
jest.mock('../../src/domain/use-cases/meal/ParseCsvMealPlan', () => ({ parseCsvMealPlan: () => [{ id: 'meal-1' }] }));
jest.mock('../../src/domain/use-cases/workout/ParseCsvWorkouts', () => ({ parseCsvWorkouts: (...args: unknown[]) => mockParseWorkouts(...args) }));
jest.mock('../../src/ui/hooks/useSupabase', () => ({
    useRepositories: () => ({
        mealRepo: { getMealPlanEntries: mockGetPlannedMeals, saveMealPlanEntries: mockSaveMeals },
        mealConsumptionRepo: {
            getMealConsumptions: mockGetMealConsumptions,
            saveMealConsumption: mockSaveMealConsumption,
        },
        workoutRepo: { getWorkouts: jest.fn(async () => []), saveWorkout: mockSaveWorkout },
        userRepo: { getUser: mockGetUser, getCurrentUserId: jest.fn(async () => 'user-1') },
    }),
}));
jest.mock('../../src/ui/hooks/useAuth', () => ({
    useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

const PlanScreen = require('../(tabs)/plan').default;

it('does not write any meals when the workout portion of the CSV is invalid', async () => {
    mockSaveMeals.mockClear();
    mockSaveWorkout.mockClear();
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockValidateRoutineCsv.mockImplementationOnce(() => { throw new Error('Linha 2: invalid workout'); });
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
    mockValidateRoutineCsv.mockReturnValue({ firstRow: { day: 'Segunda-feira', time: '07:00' }, rows: [], meals: [], workouts: [] });
    mockConfirmRoutine.mockRejectedValueOnce(new Error('network failure'));
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText('Confirmar importação'));
    fireEvent.press(screen.getByText('Confirmar importação'));
    await waitFor(() => screen.getByText(/network failure/));
    expect(mockSaveMeals).not.toHaveBeenCalled();
    expect(mockSaveWorkout).not.toHaveBeenCalled();
});

it('does not write anything when CSV structure is invalid', async () => {
    mockSaveImport.mockClear();
    mockSaveMeals.mockClear();
    mockSaveWorkout.mockClear();
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockReadRoutineCsv.mockImplementationOnce(() => { throw new Error('Linha 2: cinco campos'); });
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText(/Linha 2/));
    expect(mockSaveImport).not.toHaveBeenCalled();
    expect(mockSaveMeals).not.toHaveBeenCalled();
    expect(mockSaveWorkout).not.toHaveBeenCalled();
});

it('previews meals and workouts before any write and requires explicit confirmation', async () => {
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockValidateRoutineCsv.mockReturnValue({ firstRow: { day: 'Segunda-feira', time: '07:00' }, rows: [
        { line: 2, day: 'Segunda-feira', time: '07:00', activity: 'Café', description: 'Ovos', focus: 'Energia' },
        { line: 3, day: 'Terça-feira', time: '18:00', activity: 'HIT', description: '1x 25min Treino HIT', focus: 'Cardio' },
    ], meals: [], workouts: [] });
    mockSaveImport.mockClear(); mockConfirmRoutine.mockClear();
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText('Confirmar importação'));
    expect(screen.getByText(/Ovos/)).toBeTruthy();
    expect(screen.getByText(/25min/)).toBeTruthy();
    expect(mockSaveImport).not.toHaveBeenCalled();
    expect(mockConfirmRoutine).not.toHaveBeenCalled();
});

it('requires a fresh preview after an expired confirmation without writing a replacement', async () => {
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockValidateRoutineCsv.mockReturnValue({ firstRow: { day: 'Segunda-feira', time: '07:00' }, rows: [], meals: [], workouts: [] });
    mockConfirmRoutine.mockRejectedValueOnce(new Error('Prévia expirada'));
    mockSaveImport.mockClear();
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText('Confirmar importação'));
    fireEvent.press(screen.getByText('Confirmar importação'));
    await waitFor(() => screen.getByText(/Prévia expirada/));
    expect(screen.queryByText('Confirmar importação')).toBeNull();
    expect(mockSaveImport).not.toHaveBeenCalled();
});

it('does not save when the user cancels the preview', async () => {
    mockGetDocument.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///plan.csv' }] });
    mockValidateRoutineCsv.mockReturnValue({ firstRow: { day: 'Segunda-feira', time: '07:00' }, rows: [], meals: [], workouts: [] });
    mockConfirmRoutine.mockClear();
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('↑ CSV'));
    fireEvent.press(screen.getByText('↑ CSV'));
    await waitFor(() => screen.getByText('Cancelar prévia'));
    fireEvent.press(screen.getByText('Cancelar prévia'));
    expect(screen.queryByText('Confirmar importação')).toBeNull();
    expect(mockConfirmRoutine).not.toHaveBeenCalled();
});

it('logs a planned meal as a timestamped consumption snapshot', async () => {
    mockSaveMealConsumption.mockClear();
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('Todos', { exact: true }));
    fireEvent.press(screen.getByText('Todos', { exact: true }));
    fireEvent.press(screen.getByText('Comi conforme planejado', { exact: true }));
    fireEvent.press(screen.getByText('Comi conforme planejado', { exact: true }));
    await waitFor(() => expect(mockSaveMealConsumption).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        plannedMealId: 'meal-1',
        activity: 'Almoço',
        description: 'Arroz e feijão',
        status: 'consumed',
        recordedAt: expect.any(Date),
    })));
    expect(mockSaveMealConsumption).toHaveBeenCalledTimes(1);
    const firstId = mockSaveMealConsumption.mock.calls[0][0].id;
    await waitFor(() => expect(screen.getByText('Registrada hoje: consumida')).toBeTruthy());
    fireEvent.press(screen.getByText('Comi conforme planejado', { exact: true }));
    await waitFor(() => expect(mockSaveMealConsumption).toHaveBeenCalledTimes(2));
    expect(mockSaveMealConsumption.mock.calls[1][0].id).toBe(firstId);
});

it('allows recording an unplanned meal', async () => {
    mockSaveMealConsumption.mockClear();
    const screen = render(<PlanScreen />);
    await waitFor(() => screen.getByText('Registrar refeição avulsa'));
    fireEvent.press(screen.getByText('Registrar refeição avulsa'));
    fireEvent.changeText(screen.getByPlaceholderText('Ex: Almoço'), 'Lanche');
    fireEvent.changeText(screen.getByPlaceholderText('Descrição da refeição'), 'Iogurte');
    fireEvent.press(screen.getByText('Salvar registro'));
    await waitFor(() => expect(mockSaveMealConsumption).toHaveBeenCalledWith(expect.objectContaining({
        plannedMealId: null,
        activity: 'Lanche',
        description: 'Iogurte',
        status: 'consumed',
    })));
});
