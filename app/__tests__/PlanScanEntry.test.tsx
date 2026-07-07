import { router } from 'expo-router';
import { navigateToFoodScan } from '../food/navigation';

jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
    },
}));

describe('PlanScreen food import entry point', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('navigates to food scan screen from shared food import navigation helper', () => {
        navigateToFoodScan();
        expect(router.push).toHaveBeenCalledWith('/food/scan');
    });
});
