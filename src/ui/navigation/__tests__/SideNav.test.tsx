import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SideNav } from '../SideNav';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));

function renderSideNav(activeIndex = 0) {
    const routes = [
        { key: 'index-key', name: 'index' },
        { key: 'plan-key', name: 'plan' },
    ];
    const descriptors = {
        'index-key': { options: { title: 'Dashboard', tabBarIcon: () => null } },
        'plan-key': { options: { title: 'Plano', tabBarIcon: () => null } },
    };
    const navigation = {
        emit: jest.fn(() => ({ defaultPrevented: false })),
        navigate: jest.fn(),
    };
    const props = {
        state: { index: activeIndex, routes },
        descriptors,
        navigation,
    } as unknown as React.ComponentProps<typeof SideNav>;
    render(<SideNav {...props} />);
    return navigation;
}

describe('SideNav', () => {
    beforeEach(() => jest.clearAllMocks());

    it('shows the brand and every tab, marking the active one', () => {
        renderSideNav(1);

        expect(screen.getByText('PHYSIQUE')).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Dashboard' }).props.accessibilityState).toMatchObject({ selected: false });
        expect(screen.getByRole('tab', { name: 'Plano' }).props.accessibilityState).toMatchObject({ selected: true });
    });

    it('navigates to an inactive tab when pressed', () => {
        const navigation = renderSideNav(0);

        fireEvent.press(screen.getByRole('tab', { name: 'Plano' }));

        expect(navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'plan-key', canPreventDefault: true });
        expect(navigation.navigate).toHaveBeenCalledWith('plan', undefined);
    });

    it('does not navigate when the active tab is pressed again', () => {
        const navigation = renderSideNav(0);

        fireEvent.press(screen.getByRole('tab', { name: 'Dashboard' }));

        expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('opens exams and body photos from secondary links', () => {
        renderSideNav();

        fireEvent.press(screen.getByRole('link', { name: 'Exames' }));
        fireEvent.press(screen.getByRole('link', { name: 'Fotos' }));

        expect(router.push).toHaveBeenNthCalledWith(1, '/exams');
        expect(router.push).toHaveBeenNthCalledWith(2, '/camera');
    });
});
