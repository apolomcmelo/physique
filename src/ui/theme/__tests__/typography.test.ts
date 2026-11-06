import { Typography } from '../typography';
import { FONT_ASSETS, FontFamily } from '../fonts';

describe('Typography fonts', () => {
    it('uses Geist for headings and body text', () => {
        expect(Typography.h1.fontFamily).toBe(FontFamily.bold);
        expect(Typography.h3.fontFamily).toBe(FontFamily.semiBold);
        expect(Typography.body.fontFamily).toBe(FontFamily.regular);
    });

    it('uses JetBrains Mono for labels and metrics', () => {
        expect(Typography.label.fontFamily).toBe(FontFamily.monoMedium);
        expect(Typography.mono.fontFamily).toBe(FontFamily.monoMedium);
    });

    it('provides the mockup metric scale in JetBrains Mono', () => {
        expect(Typography.display).toMatchObject({ fontFamily: FontFamily.monoBold, fontSize: 48, lineHeight: 52 });
        expect(Typography.metricLg).toMatchObject({ fontFamily: FontFamily.monoBold, fontSize: 28, lineHeight: 32 });
        expect(Typography.metricMd).toMatchObject({ fontFamily: FontFamily.monoMedium, fontSize: 20, lineHeight: 24 });
        expect(Typography.metricSm).toMatchObject({ fontFamily: FontFamily.monoMedium, fontSize: 14, lineHeight: 18 });
    });

    it('provides a compact mono caption for metric labels', () => {
        expect(Typography.labelMono).toMatchObject({ fontFamily: FontFamily.monoMedium, fontSize: 11, lineHeight: 14 });
    });

    it('uses the mockup page title size', () => {
        expect(Typography.title).toMatchObject({ fontFamily: FontFamily.bold, fontSize: 32, lineHeight: 38 });
    });

    it('only references fonts loaded by the root layout', () => {
        Object.values(Typography).forEach((style) => {
            expect(Object.keys(FONT_ASSETS)).toContain(style.fontFamily);
        });
    });
});
