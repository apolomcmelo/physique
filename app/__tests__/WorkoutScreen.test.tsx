import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockGetWorkouts = jest.fn();
const mockDeleteWorkout = jest.fn();
const mockConfirm = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
    __esModule: true,
    default: jest.fn(() => ({ width: 390, height: 844, scale: 1, fontScale: 1 })),
}));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../src/ui/utils/dialogs', () => ({ confirmAsync: (...args: unknown[]) => mockConfirm(...args) }));
jest.mock('../../src/ui/components/WorkoutDetailModal', () => {
    const { Text } = jest.requireActual('react-native');
    return {
        WorkoutDetailModal: ({ visible, workout }: { visible: boolean; workout: { name: string } | null }) =>
            visible && workout ? <Text>{`modal:${workout.name}`}</Text> : null,
    };
});
jest.mock('../../src/ui/components/WorkoutFormModal', () => {
    const { Text } = jest.requireActual('react-native');
    return { WorkoutFormModal: ({ visible }: { visible: boolean }) => (visible ? <Text>form-open</Text> : null) };
});
jest.mock('../../src/ui/hooks/useSupabase', () => ({
    useRepositories: () => ({ workoutRepo: { getWorkouts: mockGetWorkouts, deleteWorkout: mockDeleteWorkout } }),
}));

const WorkoutScreen = require('../(tabs)/workout').default;

const NOW = new Date(2026, 8, 25, 17, 45); // Friday
const exercise = (name: string, overrides = {}) => ({
    id: name, name, sets: 4, repsPerSet: 10, weightKg: 32, durationSeconds: null, notes: null, ...overrides,
});
const make = (id: string, name: string, type: string, scheduledAt: Date | null, exercises: unknown[]) => ({
    id, name, type, scheduledAt, exercises, createdAt: NOW, updatedAt: NOW,
});
const today = make('w-today', 'Hipertrofia A', 'Weightlifting', new Date(2026, 8, 25, 18, 0), [
    exercise('Supino Reto'), exercise('Crucifixo'), exercise('Tríceps Corda', { weightKg: null }), exercise('Paralelas'),
]);
const tuesday = make('w-tue', 'Calistenia Força', 'Calisthenics', new Date(2026, 8, 22, 7, 0), [
    exercise('Muscle-up', { sets: 3, repsPerSet: 4, weightKg: null }),
]);
const loose = make('w-loose', 'HIIT Queima', 'HIT', null, [exercise('Burpee', { sets: 2, weightKg: null })]);

function setWidth(width: number) {
    (useWindowDimensions as jest.Mock).mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });
}

async function renderScreen() {
    render(<WorkoutScreen />);
    await waitFor(() => expect(screen.getByText('Treinos Planejados & Rotinas')).toBeTruthy());
}

const card = (id: string) => screen.getByTestId(`workout-card-${id}`);
const hasCard = (id: string) => screen.queryByTestId(`workout-card-${id}`) !== null;

beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();
    setWidth(390);
    mockGetWorkouts.mockResolvedValue([today, tuesday, loose]);
    mockConfirm.mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

describe('Workout page header and card summary', () => {
    it('counts the routines', async () => {
        await renderScreen();
        expect(screen.getByText('3 rotinas')).toBeTruthy();
    });

    it('shows type badge, weekday and HOJE tag on a workout scheduled for today', async () => {
        await renderScreen();
        const c = within(card('w-today'));
        expect(c.getByText('Hipertrofia A')).toBeTruthy();
        expect(c.getByText('Musculação')).toBeTruthy();
        expect(c.getByText('Sexta')).toBeTruthy();
        expect(c.getByText('HOJE')).toBeTruthy();
        expect(within(card('w-tue')).queryByText('HOJE')).toBeNull();
    });

    it('shows exercise count, total sets and estimated duration', async () => {
        await renderScreen();
        const c = within(card('w-today'));
        expect(c.getByText('4 mov.')).toBeTruthy();
        expect(c.getByText('16 séries')).toBeTruthy();
        expect(c.getByText('23 min')).toBeTruthy();
    });

    it('previews the first three exercises with their prescription', async () => {
        await renderScreen();
        const c = within(card('w-today'));
        expect(c.getByText('1. Supino Reto')).toBeTruthy();
        expect(c.getAllByText('4x 10 • 32 kg')).toHaveLength(2);
        expect(c.getByText('4x 10')).toBeTruthy();
        expect(c.getByText('3. Tríceps Corda')).toBeTruthy();
        expect(c.queryByText('4. Paralelas')).toBeNull();
    });

    it('marks an unscheduled workout instead of showing a weekday', async () => {
        await renderScreen();
        expect(within(card('w-loose')).getByText('Sem agendamento')).toBeTruthy();
    });
});

describe('Workout page actions', () => {
    it('starts the workout straight from the card', async () => {
        await renderScreen();
        fireEvent.press(within(card('w-tue')).getByText('Iniciar Treino'));
        expect(mockPush).toHaveBeenCalledWith('/workout/active?id=w-tue');
    });

    it('opens the detail modal when the card is tapped', async () => {
        await renderScreen();
        fireEvent.press(within(card('w-tue')).getByText('Calistenia Força'));
        expect(screen.getByText('modal:Calistenia Força')).toBeTruthy();
    });

    it('opens the creation form from the header button', async () => {
        await renderScreen();
        fireEvent.press(screen.getByLabelText('Novo treino'));
        expect(screen.getByText('form-open')).toBeTruthy();
    });

    it('offers a placeholder card that opens the creation form', async () => {
        await renderScreen();
        fireEvent.press(screen.getByText('Adicionar Nova Sessão'));
        expect(screen.getByText('form-open')).toBeTruthy();
    });

    it('deletes a workout after confirmation', async () => {
        await renderScreen();
        fireEvent.press(screen.getByLabelText('Excluir Hipertrofia A'));
        await waitFor(() => expect(mockDeleteWorkout).toHaveBeenCalledWith('w-today'));
    });
});

describe('Workout page filters', () => {
    it('keeps the empty state when there are no workouts', async () => {
        mockGetWorkouts.mockResolvedValue([]);
        await renderScreen();
        expect(screen.getByText('Sem treinos')).toBeTruthy();
    });

    it('filters by today', async () => {
        await renderScreen();
        fireEvent.press(screen.getByText('Hoje'));
        expect(hasCard('w-today')).toBe(true);
        expect(hasCard('w-tue')).toBe(false);
        expect(screen.getByText('1 rotina')).toBeTruthy();
    });

    it('filters by weekday', async () => {
        await renderScreen();
        fireEvent.press(screen.getByTestId('day-filter-2'));
        expect(hasCard('w-tue')).toBe(true);
        expect(hasCard('w-today')).toBe(false);
    });

    it('filters unscheduled workouts', async () => {
        await renderScreen();
        fireEvent.press(screen.getByTestId('day-filter-unscheduled'));
        expect(hasCard('w-loose')).toBe(true);
        expect(hasCard('w-tue')).toBe(false);
    });

    it('filters by type', async () => {
        await renderScreen();
        fireEvent.press(screen.getByTestId('type-filter-HIT'));
        expect(hasCard('w-loose')).toBe(true);
        expect(hasCard('w-today')).toBe(false);
    });

    it('searches by workout or exercise name', async () => {
        await renderScreen();
        fireEvent.changeText(screen.getByPlaceholderText('Buscar por treino ou exercício...'), 'muscle');
        expect(hasCard('w-tue')).toBe(true);
        expect(hasCard('w-today')).toBe(false);
    });

    it('explains when filters hide everything', async () => {
        await renderScreen();
        fireEvent.changeText(screen.getByPlaceholderText('Buscar por treino ou exercício...'), 'zzz');
        expect(screen.getByText('Nenhum treino encontrado')).toBeTruthy();
    });

    it('sorts by name', async () => {
        await renderScreen();
        fireEvent.press(screen.getByText('Nome (A-Z)'));
        const ids = screen.getAllByTestId(/^workout-card-/).map((node) => node.props.testID);
        expect(ids).toEqual(['workout-card-w-tue', 'workout-card-w-loose', 'workout-card-w-today']);
    });
});

describe('Workout page responsive grid', () => {
    const itemWidth = () => StyleSheet.flatten(screen.getByTestId('workout-grid-item-w-today').props.style).width;

    it.each([
        [390, '100%'],
        [800, '50%'],
    ])('uses the right column width at %ipx', async (width, expected) => {
        setWidth(width);
        await renderScreen();
        expect(itemWidth()).toBe(expected);
    });

    it('uses three columns on large screens', async () => {
        setWidth(1400);
        await renderScreen();
        expect(String(itemWidth())).toMatch(/^33\.3/);
    });
});
