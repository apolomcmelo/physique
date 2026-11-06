import { Colors } from '../colors';

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
    const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

describe('Kinetic Obsidian palette', () => {
    it.each([
        ['textPrimary', 'background'],
        ['textSecondary', 'surface'],
        ['textSecondary', 'surfaceElevated'],
        ['primary', 'background'],
        ['primary', 'surface'],
        ['secondary', 'surface'],
        ['error', 'surface'],
        ['warning', 'surface'],
        ['onPrimary', 'primary'],
        ['onPrimary', 'success'],
        ['onError', 'error'],
    ] as const)('%s on %s meets WCAG AA for text', (foreground, background) => {
        expect(contrast(Colors[foreground], Colors[background])).toBeGreaterThanOrEqual(4.5);
    });

    it('uses the mockup accent colours', () => {
        expect(Colors.primary).toBe('#75FF9E');
        expect(Colors.secondary).toBe('#4CD7F6');
        expect(Colors.background).toBe('#0F131D');
    });
});
