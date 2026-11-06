import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Button } from '../Button';
import { Colors } from '../../theme';

function labelColor(label: string) {
    return StyleSheet.flatten(screen.getByText(label).props.style).color;
}

describe('Button', () => {
    it('renders filled labels in the readable on-colour of their background', () => {
        render(
            <>
                <Button label="Salvar" onPress={jest.fn()} />
                <Button label="Excluir" variant="danger" onPress={jest.fn()} />
            </>,
        );

        expect(labelColor('Salvar')).toBe(Colors.onPrimary);
        expect(labelColor('Excluir')).toBe(Colors.onError);
    });
});
