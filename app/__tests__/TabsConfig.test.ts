import { APP_TABS, SECONDARY_NAV_LINKS, isWideLayout } from '../../src/ui/navigation/tabConfig';

describe('tabs configuration', () => {
    it('includes a dedicated nutrition tab', () => {
        const nutritionTab = APP_TABS.find((tab) => tab.name === 'nutrition');

        expect(nutritionTab).toBeDefined();
        expect(nutritionTab?.title).toBe('Nutrição');
        expect(nutritionTab?.icon).toBe('restaurant');
    });

    it('links exams and body photos to their existing routes', () => {
        expect(SECONDARY_NAV_LINKS).toEqual([
            { title: 'Exames', icon: 'monitor-heart', href: '/exams' },
            { title: 'Fotos', icon: 'photo-camera', href: '/camera' },
        ]);
    });

    it('switches to the wide layout from 768 px', () => {
        expect(isWideLayout(767)).toBe(false);
        expect(isWideLayout(768)).toBe(true);
    });
});
