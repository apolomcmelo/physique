import fs from 'fs';
import path from 'path';

describe('mobile web viewport setup', () => {
    it('defines the required viewport meta tag and base CSS reset', () => {
        const htmlPath = path.join(__dirname, '..', '+html.tsx');
        const source = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

        expect(source).toContain('name="viewport"');
        expect(source).toContain('width=device-width');
        expect(source).toContain('overflow-x: hidden');
        expect(source).toContain('html, body, #root');
    });
});
