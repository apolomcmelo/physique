import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockGetWeightHistory = jest.fn();
const mockGetWeightGoals = jest.fn();
const mockGetWorkouts = jest.fn();
const mockGetMealPlanEntries = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
    __esModule: true,
    default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => {
    const { useEffect } = jest.requireActual('react');
    return {
        router: { push: (...args: unknown[]) => mockPush(...args) },
        useFocusEffect: (callback: () => void) => useEffect(callback, []),
    };
});
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));
jest.mock('../../src/adapters/local/LocalStorage', () => ({ getItem: jest.fn(async () => null) }));
jest.mock('../../src/ui/components/WorkoutDetailModal', () => {
    const { Text } = jest.requireActual('react-native');
    return {
        WorkoutDetailModal: ({ visible, workout }: { visible: boolean; workout: { name: string } | null }) =>
            visible && workout ? <Text>{`modal:${workout.name}`}</Text> : null,
    };
});
jest.mock('../../src/ui/hooks/useSupabase', () => ({
    useRepositories: () => ({
        weightRepo: { getWeightHistory: mockGetWeightHistory },
        weightGoalRepo: { getWeightGoals: mockGetWeightGoals },
        workoutRepo: { getWorkouts: mockGetWorkouts },
        mealRepo: { getMealPlanEntries: mockGetMealPlanEntries },
    }),
}));

const DashboardScreen = require('../(tabs)/index').default;

const NOW = new Date(2026, 8, 25, 17, 45);
const day = (date: number, hour = 7) => new Date(2026, 8, date, hour, 15);
const record = (recordedAt: Date, values: { weightKg?: number; bodyFatPercentage?: number; proteinPercentage?: number }) => ({
    id: recordedAt.toISOString(), userId: 'user-1', recordedAt,
    weightKg: values.weightKg ?? null,
    bodyFatPercentage: values.bodyFatPercentage ?? null,
    proteinPercentage: values.proteinPercentage ?? null,
});
const goal = { id: 'goal-1', userId: 'user-1', targetWeightKg: 70.5, startedAt: new Date(2026, 8, 1), createdAt: new Date(2026, 8, 1) };
const workout = {
    id: 'workout-1', name: 'Treino A', type: 'Weightlifting', scheduledAt: new Date(2026, 8, 25, 18, 0),
    createdAt: NOW, updatedAt: NOW,
    exercises: [1, 2, 3].map((n) => ({ id: `e${n}`, name: `Exercício ${n}`, sets: 3, repsPerSet: 10, weightKg: null, durationSeconds: null, notes: null })),
};
const dinner = { id: 'meal-1', day: 'Sexta-feira', time: '19:30', activity: 'Jantar', description: 'Frango e arroz', biologicalObjective: 'Recuperação' };

function setWidth(width: number) {
    (useWindowDimensions as jest.Mock).mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });
}

async function renderDashboard() {
    render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Visão Geral')).toBeTruthy());
}

beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();
    setWidth(390);
    mockGetWeightHistory.mockResolvedValue([
        record(new Date(2026, 7, 31, 8, 0), { weightKg: 75.5, bodyFatPercentage: 18.5 }),
        record(day(20), { weightKg: 73.5, bodyFatPercentage: 17.2, proteinPercentage: 20.5 }),
        record(day(22), { proteinPercentage: 21 }),
        record(day(24), { weightKg: 72.9 }),
    ]);
    mockGetWeightGoals.mockResolvedValue([goal]);
    mockGetWorkouts.mockResolvedValue([workout]);
    mockGetMealPlanEntries.mockResolvedValue([dinner]);
});

afterEach(() => {
    jest.useRealTimers();
});

describe('Dashboard', () => {
    it('shows the overview header', async () => {
        await renderDashboard();

        expect(screen.getByText('Acompanhamento diário essencial e metas ativas.')).toBeTruthy();
    });

    it('shows current weight against the goal with progress from the baseline', async () => {
        await renderDashboard();

        expect(screen.getByText('Peso Corporal & Meta')).toBeTruthy();
        expect(screen.getByText('Última aferição: 24/09/2026')).toBeTruthy();
        expect(screen.getByText('-0,6 kg vs anterior')).toBeTruthy();
        expect(screen.getByText('72,9')).toBeTruthy();
        expect(screen.getByText('Meta final')).toBeTruthy();
        expect(screen.getByText('70,5')).toBeTruthy();
        expect(screen.getByText('52% concluído')).toBeTruthy();
        expect(screen.getByText('Ponto de partida: 75,5 kg')).toBeTruthy();
        expect(screen.getByText('Faltam 2,4 kg para a meta')).toBeTruthy();
    });

    it('explains when progress has no baseline', async () => {
        mockGetWeightHistory.mockResolvedValue([record(day(24), { weightKg: 72.9 })]);
        await renderDashboard();

        expect(screen.getByText('Progresso indisponível: registre uma medição de peso na data de início da meta ou antes.')).toBeTruthy();
        expect(screen.queryByText(/concluído/)).toBeNull();
    });

    it('explains when no weight was measured', async () => {
        mockGetWeightHistory.mockResolvedValue([]);
        await renderDashboard();

        expect(screen.getByText('Nenhuma aferição registrada')).toBeTruthy();
        expect(screen.getAllByText('—')).toHaveLength(3);
        expect(screen.queryByText(/vs anterior/)).toBeNull();
    });

    it('shows the latest body fat and protein, each with its own date', async () => {
        await renderDashboard();

        expect(screen.getByText('Composição Corporal')).toBeTruthy();
        expect(screen.getByText('17,2%')).toBeTruthy();
        expect(screen.getByText('Medido em 20/09/2026')).toBeTruthy();
        expect(screen.getByText('21%')).toBeTruthy();
        expect(screen.getByText('Medido em 22/09/2026')).toBeTruthy();

        fireEvent.press(screen.getByText('Histórico completo'));
        expect(mockPush).toHaveBeenCalledWith('/history');
    });

    it('shows placeholders when no composition was measured', async () => {
        mockGetWeightHistory.mockResolvedValue([record(day(24), { weightKg: 72.9 })]);
        await renderDashboard();

        expect(screen.getAllByText('—')).toHaveLength(2);
        expect(screen.getAllByText('Sem medição')).toHaveLength(2);
    });

    it('opens the next workout details from its button', async () => {
        await renderDashboard();

        expect(screen.getByText('Próximo treino')).toBeTruthy();
        expect(screen.getByText('Treino A')).toBeTruthy();
        expect(screen.getByText('Hoje • 18:00')).toBeTruthy();
        expect(screen.getByText('Em 15 minutos')).toBeTruthy();
        expect(screen.getByText('3 exercícios • Musculação')).toBeTruthy();

        fireEvent.press(screen.getByText('Ir para Treinos'));
        expect(screen.getByText('modal:Treino A')).toBeTruthy();
    });

    it('opens the following scheduled workout when none is within the hour', async () => {
        mockGetWorkouts.mockResolvedValue([{ ...workout, scheduledAt: new Date(2026, 8, 26, 7, 0) }]);
        await renderDashboard();

        expect(screen.getByText('Nenhum treino na próxima hora')).toBeTruthy();
        expect(screen.getByText('Próximo: Treino A em 26/09/2026 às 07:00')).toBeTruthy();

        fireEvent.press(screen.getByText('Ir para Treinos'));
        expect(screen.getByText('modal:Treino A')).toBeTruthy();
    });

    it('goes to the Treinos tab when nothing is scheduled', async () => {
        mockGetWorkouts.mockResolvedValue([]);
        await renderDashboard();

        fireEvent.press(screen.getByText('Ir para Treinos'));
        expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    it('does not open a workout when the weight card is pressed', async () => {
        await renderDashboard();

        fireEvent.press(screen.getByText('72,9'));
        expect(screen.queryByText('modal:Treino A')).toBeNull();
    });

    it('shows the next meal and links to Nutrição', async () => {
        await renderDashboard();

        expect(screen.getByText('Próxima refeição')).toBeTruthy();
        expect(screen.getByText('Jantar')).toBeTruthy();
        expect(screen.getByText('Frango e arroz')).toBeTruthy();
        expect(screen.getByText('Horário planejado: 19:30')).toBeTruthy();

        fireEvent.press(screen.getByText('Ir para Nutrição'));
        expect(mockPush).toHaveBeenCalledWith('/nutrition');
    });

    it('acknowledges water without tracking volume', async () => {
        await renderDashboard();

        fireEvent.press(screen.getByText('Sim'));

        expect(screen.getByText('Excelente 😌')).toBeTruthy();
        expect(screen.getByText('Registrado')).toBeTruthy();
        expect(screen.queryByText(/ml/)).toBeNull();
    });

    it('places weight and composition side by side on wide screens', async () => {
        setWidth(1440);
        await renderDashboard();

        expect(StyleSheet.flatten(screen.getByTestId('dashboard-metrics-row').props.style).flexDirection).toBe('row');
        expect(StyleSheet.flatten(screen.getByTestId('dashboard-agenda-row').props.style).flexDirection).toBe('row');
    });

    it('stacks the cards on phones', async () => {
        await renderDashboard();

        expect(StyleSheet.flatten(screen.getByTestId('dashboard-metrics-row').props.style).flexDirection).toBe('column');
        expect(StyleSheet.flatten(screen.getByTestId('dashboard-agenda-row').props.style).flexDirection).toBe('column');
    });
});
