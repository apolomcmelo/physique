import { APP_TABS } from '../(tabs)/tabConfig';

describe('tabs configuration', () => {
    it('includes a dedicated nutrition tab', () => {
        const nutritionTab = APP_TABS.find((tab) => tab.name === 'nutrition');

        expect(nutritionTab).toBeDefined();
        expect(nutritionTab?.title).toBe('Nutrição');
        expect(nutritionTab?.icon).toBe('nutrition-outline');
    });
});
