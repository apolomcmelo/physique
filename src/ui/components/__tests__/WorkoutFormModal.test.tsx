import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);

import { WorkoutFormModal } from '../WorkoutFormModal';

const NOW = new Date(2026, 8, 25, 17, 45);
const exercise = (id: string, name: string, overrides = {}) => ({
    id, name, orderIndex: 0, sets: 4, repsPerSet: 10, durationSeconds: null, weightKg: 80,
    restSecondsBetweenSets: 90, restSecondsBeforeNextExercise: 120, notes: null, ...overrides,
});
const workout = {
    id: 'w1', name: 'Hipertrofia A', type: 'Weightlifting' as const, scheduledAt: null,
    exercises: [exercise('e1', 'Supino Reto'), exercise('e2', 'Paralelas', { sets: 3, weightKg: null })],
    createdAt: NOW, updatedAt: NOW,
};

function setup(props: Record<string, unknown> = {}) {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    render(<WorkoutFormModal visible workout={workout as never} onSave={onSave} onClose={onClose} {...props} />);
    return { onSave, onClose };
}

const nameInputs = () => screen.getAllByPlaceholderText('Ex: Flexões');
const setsInputs = () => screen.getAllByPlaceholderText('Ex: 4');

describe('WorkoutFormModal header', () => {
    it('shows the workout name and edit mode badge when editing', () => {
        setup();
        expect(screen.getByText('Editar Treino: Hipertrofia A')).toBeTruthy();
        expect(screen.getByText('Modo Edição')).toBeTruthy();
        expect(screen.getByText('Salvar Alterações')).toBeTruthy();
    });

    it('shows creation labels for a new workout', () => {
        setup({ workout: null });
        expect(screen.getByText('Novo Treino')).toBeTruthy();
        expect(screen.queryByText('Modo Edição')).toBeNull();
        expect(screen.getByText('Criar Treino')).toBeTruthy();
    });

    it('closes from Cancelar and from the back button', () => {
        const { onClose } = setup();
        fireEvent.press(screen.getByText('Cancelar'));
        fireEvent.press(screen.getByLabelText('Voltar'));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe('WorkoutFormModal exercise list', () => {
    it('counts exercises and numbers each card', () => {
        setup();
        expect(screen.getByText('2 Exercícios')).toBeTruthy();
        expect(screen.getByText('01')).toBeTruthy();
        expect(screen.getByText('02')).toBeTruthy();
    });

    it('uses the singular for one exercise', () => {
        setup({ workout: { ...workout, exercises: [workout.exercises[0]] } });
        expect(screen.getByText('1 Exercício')).toBeTruthy();
    });

    it('labels every field of an exercise card', () => {
        setup({ workout: { ...workout, exercises: [workout.exercises[0]] } });
        ['Séries', 'Reps', 'Carga (kg)', 'Duração (s)', 'Descanso Séries', 'Descanso Pós-Exercício'].forEach((label) =>
            expect(screen.getByText(label)).toBeTruthy());
    });

    it('adds an exercise with the dashed button', () => {
        setup();
        fireEvent.press(screen.getByText('+ Adicionar Novo Exercício'));
        expect(screen.getByText('2 Exercícios')).toBeTruthy();
        expect(nameInputs()).toHaveLength(3);
    });

    it('removes an exercise', () => {
        setup();
        fireEvent.press(screen.getByLabelText('Remover exercício 1'));
        expect(nameInputs()).toHaveLength(1);
        expect(screen.getByDisplayValue('Paralelas')).toBeTruthy();
    });

    it('duplicates an exercise right after the original', () => {
        setup();
        fireEvent.press(screen.getByLabelText('Duplicar exercício 1'));
        const names = nameInputs().map((input) => input.props.value);
        expect(names).toEqual(['Supino Reto', 'Supino Reto', 'Paralelas']);
    });

    it('moves an exercise down', () => {
        setup();
        fireEvent.press(screen.getByLabelText('Mover exercício 1 para baixo'));
        expect(nameInputs().map((input) => input.props.value)).toEqual(['Paralelas', 'Supino Reto']);
    });
});

describe('WorkoutFormModal sets stepper', () => {
    it('increments and decrements sets', () => {
        setup();
        fireEvent.press(screen.getByLabelText('Aumentar séries do exercício 1'));
        expect(setsInputs()[0].props.value).toBe('5');
        fireEvent.press(screen.getByLabelText('Diminuir séries do exercício 1'));
        fireEvent.press(screen.getByLabelText('Diminuir séries do exercício 1'));
        expect(setsInputs()[0].props.value).toBe('3');
    });

    it('never goes below one set', () => {
        setup({ workout: { ...workout, exercises: [exercise('e1', 'Prancha', { sets: 1 })] } });
        fireEvent.press(screen.getByLabelText('Diminuir séries do exercício 1'));
        expect(setsInputs()[0].props.value).toBe('1');
    });

    it('starts from one when sets are empty', () => {
        setup({ workout: null });
        fireEvent.press(screen.getByLabelText('Aumentar séries do exercício 1'));
        expect(setsInputs()[0].props.value).toBe('1');
    });
});

describe('WorkoutFormModal saving', () => {
    it('saves the edited values', async () => {
        const { onSave, onClose } = setup();
        fireEvent.press(screen.getByLabelText('Aumentar séries do exercício 1'));
        fireEvent.press(screen.getByText('Salvar Alterações'));
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const saved = onSave.mock.calls[0][0];
        expect(saved.name).toBe('Hipertrofia A');
        expect(saved.exercises[0]).toMatchObject({ name: 'Supino Reto', sets: 5, repsPerSet: 10, weightKg: 80 });
        expect(saved.exercises[1]).toMatchObject({ name: 'Paralelas', sets: 3, weightKg: null });
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('shows a validation error when the name is empty', () => {
        const { onSave } = setup({ workout: null });
        fireEvent.press(screen.getByText('Criar Treino'));
        expect(screen.getByText('Nome do treino é obrigatório')).toBeTruthy();
        expect(onSave).not.toHaveBeenCalled();
    });

    it('selects the workout type', async () => {
        const { onSave } = setup();
        fireEvent.press(screen.getByText('Calistenia'));
        fireEvent.press(screen.getByText('Salvar Alterações'));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave.mock.calls[0][0].type).toBe('Calisthenics');
    });
});
