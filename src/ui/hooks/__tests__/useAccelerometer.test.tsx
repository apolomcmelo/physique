import React from 'react';
import renderer, { act } from 'react-test-renderer';

let mockPlatformOS = 'web';
const mockSetUpdateInterval = jest.fn();
const mockAddListener = jest.fn();

jest.mock('react-native', () => {
    return {
        Platform: {
            OS: mockPlatformOS,
        },
    };
});

jest.mock('expo-sensors', () => ({
    Accelerometer: {
        setUpdateInterval: (...args: unknown[]) => mockSetUpdateInterval(...args),
        addListener: (...args: unknown[]) => mockAddListener(...args),
    },
}));

const { useAccelerometer } = require('../useAccelerometer');

function HookProbe() {
    useAccelerometer();

    return null;
}

describe('useAccelerometer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatformOS = 'web';
    });

    it('skips sensor subscription on web', () => {
        act(() => {
            renderer.create(<HookProbe />);
        });

        expect(mockSetUpdateInterval).not.toHaveBeenCalled();
        expect(mockAddListener).not.toHaveBeenCalled();
    });
});
