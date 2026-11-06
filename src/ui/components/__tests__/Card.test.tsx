import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Card } from '../Card';
import { Colors, Radius } from '../../theme';

describe('Card', () => {
    it('uses the mockup surface with a subtle outline', () => {
        const { getByTestId } = render(<Card testID="card"><Text>Body</Text></Card>);

        expect(StyleSheet.flatten(getByTestId('card').props.style)).toMatchObject({
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.borderSubtle,
        });
    });
});
