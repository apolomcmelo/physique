import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockReplace = jest.fn();
const mockSaveSession = jest.fn(async () => {});
const mockGetWorkout = jest.fn();
const mockTimerComplete = jest.fn();
const mockGetSessions = jest.fn<Promise<unknown[]>, []>(async () => []);
const mockDeleteSession = jest.fn(async () => {});
jest.mock('expo-router', () => ({
    router: { replace: (...args: unknown[]) => mockReplace(...args), back: jest.fn() },
    useLocalSearchParams: () => ({ id: 'workout-1' }),
}));
jest.mock('../../src/ui/hooks/useSupabase', () => ({ useRepositories: () => ({ workoutRepo: {
    getWorkoutById: mockGetWorkout, saveWorkoutSession: mockSaveSession,
    getWorkoutSessions: mockGetSessions, deleteWorkoutSession: mockDeleteSession,
} }) }));
jest.mock('../../src/ui/components/WorkoutTimer', () => ({ WorkoutTimer: ({ onComplete }: { onComplete: () => void }) => { mockTimerComplete.mockImplementation(onComplete); return null; } }));
const ActiveWorkoutScreen = require('../workout/active').default;

const workout = { id: 'workout-1', name: 'Supino', type: 'Weightlifting', scheduledAt: null,
    createdAt: new Date('2026-09-25T10:00:00Z'), updatedAt: new Date('2026-09-25T10:00:00Z'),
    exercises: [{ id: 'exercise-1', name: 'Supino reto', sets: 1, repsPerSet: 10,
        weightKg: 20, durationSeconds: null, notes: null, orderIndex: 0 }],
};

beforeEach(() => { jest.clearAllMocks(); mockGetWorkout.mockResolvedValue(workout); mockGetSessions.mockResolvedValue([]); mockSaveSession.mockResolvedValue(undefined); });

it('records the one-set workout before showing Finish and never starts final rest', async () => {
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    expect(screen.queryByText('Finalizar Treino 🏁')).toBeNull();
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    expect(screen.queryByText('PULAR DESCANSO')).toBeNull();
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ setNumber: 1 })] }));
    fireEvent.press(screen.getByText('Finalizar Treino 🏁'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workout'));
});

it('leaves the same set executable after a failed save', async () => {
    mockSaveSession.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network'));
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Erro ao registrar série'));
    expect(screen.queryByText('Finalizar Treino 🏁')).toBeNull();
    expect(screen.getByText('✓ Terminei a Série')).toBeTruthy();
});

it('records edited performed repetitions and load instead of the prescription', async () => {
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.changeText(screen.getByDisplayValue('10'), '8');
    fireEvent.changeText(screen.getByDisplayValue('20'), '17,5');
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({
        repsCompleted: 8, weightUsedKg: 17.5, prescribedReps: 10, prescribedWeightKg: 20,
    })] })));
});

it('shows the prescribed 60-second rest between sets and lets the user skip it', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [{ ...workout.exercises[0], sets: 2 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    expect(screen.getByText('Descanso 60s')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('PULAR DESCANSO'));
    fireEvent.press(screen.getByText('PULAR DESCANSO'));
    await waitFor(() => screen.getByText('Série 2'));
    expect(screen.queryByText('Finalizar Treino 🏁')).toBeNull();
});

it('allows a zero-second rest override without changing the workout prescription', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [{ ...workout.exercises[0], sets: 2, restSecondsBetweenSets: 20 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Descanso 20s'));
    fireEvent.press(screen.getByLabelText('Diminuir descanso em 15 segundos'));
    fireEvent.press(screen.getByLabelText('Diminuir descanso em 15 segundos'));
    expect(screen.getByText('Descanso 0s')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Série 2'));
    expect(mockGetWorkout).toHaveBeenCalled();
});

it('inherits the between-set rest for a transition and honours an explicit zero override', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [
        { ...workout.exercises[0], sets: 1, restSecondsBetweenSets: 20, restSecondsBeforeNextExercise: 0 },
        { ...workout.exercises[0], id: 'exercise-2', name: 'Flexão', sets: 1 },
    ] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    expect(screen.getByText('Descanso 0s')).toBeTruthy();
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Flexão'));
    expect(screen.queryByText('PULAR DESCANSO')).toBeNull();
});

it('does not create a duplicate set when completion is pressed rapidly twice', async () => {
    let releaseSave = () => {};
    const waiting = new Promise<void>((resolve) => { releaseSave = resolve; });
    mockSaveSession.mockResolvedValueOnce(undefined).mockImplementationOnce(() => waiting);
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    releaseSave();
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    expect(mockSaveSession).toHaveBeenCalledTimes(2);
});

it('records one timed HIT set with elapsed performed time when ended early', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    mockGetWorkout.mockResolvedValue({ ...workout, type: 'HIT', exercises: [{ ...workout.exercises[0], sets: 1, repsPerSet: null, weightKg: null, durationSeconds: 1500 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('▶ Iniciar Série'));
    fireEvent.press(screen.getByText('▶ Iniciar Série'));
    jest.setSystemTime(new Date('2026-09-25T10:23:30Z'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({
        durationSeconds: 1410, repsCompleted: 0, weightUsedKg: null,
    })] })));
    jest.useRealTimers();
});

it('records only the expired timed set and waits for a user action after elapsed rest', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    mockGetWorkout.mockResolvedValue({ ...workout, type: 'HIT', exercises: [{ ...workout.exercises[0], sets: 2, repsPerSet: null, weightKg: null, durationSeconds: 45 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('▶ Iniciar Série'));
    fireEvent.press(screen.getByText('▶ Iniciar Série'));
    jest.setSystemTime(new Date('2026-09-25T10:02:00Z'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Continuar após descanso'));
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ durationSeconds: 45, setNumber: 1 })] }));
    expect(mockSaveSession).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Série 2')).toBeNull();
    fireEvent.press(screen.getByText('Continuar após descanso'));
    await waitFor(() => screen.getByText('Série 2'));
    expect(screen.getByText('▶ Iniciar Série')).toBeTruthy();
    jest.useRealTimers();
});

it('records the expired timed set once and shows elapsed rest rather than auto-starting another set', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    mockGetWorkout.mockResolvedValue({ ...workout, type: 'HIT', exercises: [{ ...workout.exercises[0], sets: 2, repsPerSet: null, weightKg: null, durationSeconds: 45 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('▶ Iniciar Série'));
    fireEvent.press(screen.getByText('▶ Iniciar Série'));
    jest.setSystemTime(new Date('2026-09-25T10:01:15Z'));
    await mockTimerComplete();
    await waitFor(() => screen.getByText('DESCANSO'));
    expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ durationSeconds: 45 })] }));
    expect(screen.queryByText('Série 2')).toBeNull();
    jest.useRealTimers();
});

it('can save recorded work as partial without finishing the missing set', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [{ ...workout.exercises[0], sets: 2 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('PULAR DESCANSO'));
    fireEvent.press(screen.getByText('Salvar parcial'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ status: 'partial', sets: [expect.objectContaining({ setNumber: 1 })] })));
});

it('offers the existing unfinished session to resume rather than starting another one', async () => {
    mockGetSessions.mockResolvedValue([{ id: 'existing-session', workoutId: 'workout-1', startedAt: new Date(), finishedAt: null, sets: [] }]);
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Retomar treino'));
    expect(mockSaveSession).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Retomar treino'));
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
});

it('resumes at the first unrecorded set instead of recording a duplicate', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [{ ...workout.exercises[0], sets: 2 }] });
    mockGetSessions.mockResolvedValue([{ id: 'existing-session', workoutId: 'workout-1', startedAt: new Date(), finishedAt: null,
        sets: [{ id: 'set-1', exerciseId: 'exercise-1', setNumber: 1, repsCompleted: 10,
            weightUsedKg: 20, completedAt: new Date() }] }]);
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Retomar treino'));
    fireEvent.press(screen.getByText('Retomar treino'));
    await waitFor(() => screen.getByText('Série 2'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [
        expect.objectContaining({ setNumber: 1 }), expect.objectContaining({ setNumber: 2 }),
    ] })));
});

it('persists exactly two sets across two exercises without requiring final rest', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [
        { ...workout.exercises[0], restSecondsBeforeNextExercise: 0 },
        { ...workout.exercises[0], id: 'exercise-2', name: 'Flexão', restSecondsBeforeNextExercise: 0 },
    ] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Flexão'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    expect(mockSaveSession).toHaveBeenLastCalledWith(expect.objectContaining({ sets: [
        expect.objectContaining({ exerciseId: 'exercise-1', setNumber: 1 }),
        expect.objectContaining({ exerciseId: 'exercise-2', setNumber: 1 }),
    ] }));
});

it('finishes a resumed session whose final set was already recorded without recording it twice', async () => {
    mockGetSessions.mockResolvedValue([{ id: 'existing-session', workoutId: 'workout-1', startedAt: new Date(), finishedAt: null,
        sets: [{ id: 'set-1', exerciseId: 'exercise-1', setNumber: 1, repsCompleted: 10,
            weightUsedKg: 20, completedAt: new Date() }] }]);
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Retomar treino'));
    fireEvent.press(screen.getByText('Retomar treino'));
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    expect(screen.queryByText('✓ Terminei a Série')).toBeNull();
    fireEvent.press(screen.getByText('Finalizar Treino 🏁'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ id: 'set-1' })] })));
});

it('requires explicit confirmation to discard a session', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('← Voltar'));
    fireEvent.press(screen.getByText('Descartar'));
    expect(alert).toHaveBeenCalledWith('Descartar treino?', expect.any(String), expect.any(Array));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDeleteSession).not.toHaveBeenCalled();
    alert.mockRestore();
});

it('corrects the performed time of a recorded timed set without adding another set', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-25T10:00:00Z'));
    mockGetWorkout.mockResolvedValue({ ...workout, type: 'HIT', exercises: [{ ...workout.exercises[0], sets: 1, repsPerSet: null, weightKg: null, durationSeconds: 1200 }] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('▶ Iniciar Série'));
    fireEvent.press(screen.getByText('▶ Iniciar Série'));
    jest.setSystemTime(new Date('2026-09-25T10:18:00Z'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    fireEvent.changeText(screen.getByDisplayValue('1080'), '1040');
    fireEvent.press(screen.getByText('Corrigir série'));
    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ durationSeconds: 1040 })] })));
    jest.useRealTimers();
});

it('does not finish a session with zero exercises', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [] });
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Supino'));
    expect(screen.queryByText('Finalizar Treino 🏁')).toBeNull();
});

it('does not navigate away when saving a partial workout fails', async () => {
    mockGetWorkout.mockResolvedValue({ ...workout, exercises: [{ ...workout.exercises[0], sets: 2 }] });
    mockSaveSession.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network'));
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('Salvar parcial'));
    fireEvent.press(screen.getByText('Salvar parcial'));
    await waitFor(() => screen.getByText('Erro ao salvar sessão parcial'));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Salvar parcial')).toBeTruthy();
});

it('does not navigate away when finishing fails and can retry with the recorded final set', async () => {
    mockSaveSession.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('network'));
    const screen = render(<ActiveWorkoutScreen />);
    await waitFor(() => screen.getByText('✓ Terminei a Série'));
    fireEvent.press(screen.getByText('✓ Terminei a Série'));
    await waitFor(() => screen.getByText('Finalizar Treino 🏁'));
    fireEvent.press(screen.getByText('Finalizar Treino 🏁'));
    await waitFor(() => screen.getByText('Erro ao finalizar treino'));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('Finalizar Treino 🏁')).toBeTruthy();
    fireEvent.press(screen.getByText('Finalizar Treino 🏁'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/workout'));
    expect(mockSaveSession).toHaveBeenLastCalledWith(expect.objectContaining({ sets: [expect.objectContaining({ setNumber: 1 })] }));
});
