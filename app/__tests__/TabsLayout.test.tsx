import React from 'react';
import { useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import TabsLayout from '../(tabs)/_layout';

const mockTabsProps = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mock('expo-router', () => {
    const Tabs = (props: unknown) => {
        mockTabsProps(props);
        return null;
    };
    Tabs.Screen = () => null;
    return { Tabs, router: { push: jest.fn() } };
});

const mockedDimensions = useWindowDimensions as jest.Mock;

function renderAtWidth(width: number) {
    mockedDimensions.mockReturnValue({ width, height: 900, scale: 1, fontScale: 1 });
    render(<TabsLayout />);
    return mockTabsProps.mock.calls.at(-1)[0];
}

describe('TabsLayout', () => {
    it('uses the bottom tab bar on narrow screens', () => {
        const props = renderAtWidth(390);

        expect(props.screenOptions.tabBarPosition).toBe('bottom');
        expect(props.tabBar).toBeUndefined();
    });

    it('uses the sidebar on wide screens', () => {
        const props = renderAtWidth(1440);

        expect(props.screenOptions.tabBarPosition).toBe('left');
        expect(props.tabBar).toEqual(expect.any(Function));
    });
});
