import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import type {} from '@testing-library/jest-native/extend-expect';

describe('Jest native matchers', () => {
    it('makes component assertions available in the full test suite', () => {
        const { getByTestId } = render(<View testID="configured-matcher" />);

        expect(getByTestId('configured-matcher')).toHaveProp('testID', 'configured-matcher');
    });
});
