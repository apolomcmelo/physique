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

    it('only references fonts loaded by the root layout', () => {
        Object.values(Typography).forEach((style) => {
            expect(Object.keys(FONT_ASSETS)).toContain(style.fontFamily);
        });
    });
});
