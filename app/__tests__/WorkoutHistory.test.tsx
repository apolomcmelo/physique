import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MealConsumption } from '../../src/domain/entities/MealConsumption';

const mockHistory = jest.fn();
const mockSaveSession = jest.fn(async () => {});
const mockMealConsumptions = jest.fn<Promise<MealConsumption[]>, []>(async () => []);
const mockSaveMealConsumption = jest.fn<Promise<void>, [MealConsumption]>(async () => {});
const mockDeleteMealConsumption = jest.fn(async () => {});
jest.mock('../../src/ui/hooks/useSupabase', () => ({ useRepositories: () => ({
    weightRepo: { getWeightHistory: jest.fn(async () => []) },
    workoutRepo: { getWorkoutSessions: mockHistory, saveWorkoutSession: mockSaveSession },
    mealConsumptionRepo: {
        getMealConsumptions: mockMealConsumptions,
        saveMealConsumption: mockSaveMealConsumption,
        deleteMealConsumption: mockDeleteMealConsumption,
    },
    userRepo: { getCurrentUserId: jest.fn(async () => 'user') },
}) }));
jest.mock('../../src/ui/utils/dialogs', () => ({ confirmAsync: jest.fn(async () => true) }));

const HistoryScreen = require('../(tabs)/history').default;

beforeEach(() => {
    mockHistory.mockResolvedValue([]);
    mockMealConsumptions.mockResolvedValue([]);
    jest.clearAllMocks();
});

it('shows the recorded workout and performed set values without fetching a deleted workout model', async () => {
    mockHistory.mockResolvedValue([{ id: 'session-1', workoutId: 'deleted-workout', workoutName: 'Peito',
        status: 'partial', startedAt: new Date('2026-09-25T10:00:00Z'), finishedAt: new Date('2026-09-25T10:10:00Z'),
        sets: [{ id: 'set-1', exerciseId: 'deleted-exercise', exerciseName: 'Supino', setNumber: 1,
            prescribedReps: 10, repsCompleted: 8, prescribedWeightKg: 20, weightUsedKg: 17.5,
            durationSeconds: null, completedAt: new Date('2026-09-25T10:05:00Z') }],
    }]);
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Treinos'));
    expect(screen.getByText('Peito')).toBeTruthy();
    expect(screen.getByText('Parcial')).toBeTruthy();
    expect(screen.getByText(/Supino.*8.*17,5/)).toBeTruthy();
});

it('shows actual and prescribed seconds for an independent timed HIT session', async () => {
    mockHistory.mockResolvedValue([{ id: 'hit-session', workoutId: 'gone', workoutName: 'HIT', status: 'complete',
        startedAt: new Date('2026-09-25T10:00:00Z'), finishedAt: new Date('2026-09-25T10:25:00Z'),
        sets: [{ id: 'hit-set', exerciseId: 'gone-exercise', exerciseName: 'Treino HIT', setNumber: 1,
            repsCompleted: 0, weightUsedKg: null, durationSeconds: 1410, prescribedDurationSeconds: 1500,
            completedAt: new Date('2026-09-25T10:23:30Z') }],
    }]);
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Treinos'));
    expect(screen.getByText(/Treino HIT.*1410s.*previsto 1500s/)).toBeTruthy();
});

it('corrects an earlier performed set through the session repository without changing its prescription', async () => {
    mockHistory.mockResolvedValue([{ id: 'session-1', workoutId: 'deleted', workoutName: 'Peito', status: 'complete',
        startedAt: new Date('2026-09-25T10:00:00Z'), finishedAt: new Date('2026-09-25T10:15:00Z'),
        sets: [{ id: 'set-1', exerciseId: 'deleted-exercise', exerciseName: 'Supino', setNumber: 1,
            repsCompleted: 8, prescribedReps: 10, weightUsedKg: 17.5, prescribedWeightKg: 20,
            durationSeconds: null, completedAt: new Date('2026-09-25T10:05:00Z') }],
    }]);
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Corrigir série 1'));
    fireEvent.changeText(screen.getByDisplayValue('8'), '9');
    fireEvent.changeText(screen.getByDisplayValue('17.5'), '16,5');
    fireEvent.press(screen.getByText('Salvar correção'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ repsCompleted: 9, weightUsedKg: 16.5, prescribedReps: 10 })] })));
});

it('allows correction of the performed seconds of a historical timed set', async () => {
    mockHistory.mockResolvedValue([{ id: 'session-1', workoutId: 'deleted', workoutName: 'HIT', status: 'partial',
        startedAt: new Date('2026-09-25T10:00:00Z'), finishedAt: new Date('2026-09-25T10:25:00Z'),
        sets: [{ id: 'set-1', exerciseId: 'deleted-exercise', exerciseName: 'Treino HIT', setNumber: 1,
            repsCompleted: 0, weightUsedKg: null, durationSeconds: 1410, prescribedDurationSeconds: 1500,
            completedAt: new Date('2026-09-25T10:23:30Z') }],
    }]);
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Treinos'));
    fireEvent.press(screen.getByText('Corrigir série 1'));
    fireEvent.changeText(screen.getByDisplayValue('1410'), '1400');
    fireEvent.press(screen.getByText('Salvar correção'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ durationSeconds: 1400, prescribedDurationSeconds: 1500 })] })));
});

it('shows actual meal history and saves corrections independently from the plan', async () => {
    mockMealConsumptions.mockResolvedValue([{
        id: 'meal-log-1', userId: 'user', plannedMealId: 'plan-1', activity: 'Almoço',
        description: 'Arroz', notes: null, status: 'consumed', recordedAt: new Date(2026, 9, 25, 12, 30),
    }]);
    mockSaveMealConsumption.mockClear();
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Refeições'));
    fireEvent.press(screen.getByText('Refeições'));
    expect(screen.getByText('Arroz')).toBeTruthy();
    fireEvent.press(screen.getByText('Corrigir registro'));
    fireEvent.changeText(screen.getByDisplayValue('Arroz'), 'Arroz e feijão');
    fireEvent.changeText(screen.getByDisplayValue('25/10/2026'), '24/10/2026');
    fireEvent.press(screen.getByText('Salvar correção'));
    await waitFor(() => expect(mockSaveMealConsumption).toHaveBeenCalledWith(expect.objectContaining({
        id: 'meal-log-1',
        plannedMealId: 'plan-1',
        description: 'Arroz e feijão',
        recordedAt: expect.any(Date),
    })));
    expect(mockSaveMealConsumption.mock.calls[0][0].recordedAt.getDate()).toBe(24);
});

it('deletes a meal record only after explicit confirmation', async () => {
    mockMealConsumptions.mockResolvedValue([{
        id: 'meal-log-2', userId: 'user', plannedMealId: null, activity: 'Lanche',
        description: 'Fruta', notes: null, status: 'consumed', recordedAt: new Date(),
    }]);
    mockDeleteMealConsumption.mockClear();
    const screen = render(<HistoryScreen />);
    await waitFor(() => screen.getByText('Refeições'));
    fireEvent.press(screen.getByText('Refeições'));
    fireEvent.press(screen.getByText('Excluir registro'));
    await waitFor(() => expect(mockDeleteMealConsumption).toHaveBeenCalledWith('meal-log-2'));
});
