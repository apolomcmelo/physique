import {
    FOOD_IMPORT_ACTION_LABEL,
    FOOD_IMPORT_HINT,
    FOOD_SCAN_RECOGNIZED_TEXT_LABEL,
    getFoodScanPrimaryActionLabel,
} from '../food/copy';

describe('Food import copy', () => {
    it('uses user-friendly action labels without technical jargon', () => {
        expect(FOOD_IMPORT_ACTION_LABEL).toBe('Importar rótulo');
        expect(FOOD_IMPORT_ACTION_LABEL.toLowerCase()).not.toContain('ocr');
    });

    it('explains camera and manual fallback in hint text', () => {
        expect(FOOD_IMPORT_HINT.toLowerCase()).toContain('câmera');
        expect(FOOD_IMPORT_HINT.toLowerCase()).toContain('manualmente');
    });

    it('returns contextual primary action label for loading and idle states', () => {
        expect(getFoodScanPrimaryActionLabel(false)).toBe('Importar tabela com a câmera');
        expect(getFoodScanPrimaryActionLabel(true)).toBe('Processando imagem...');
    });

    it('uses non-technical recognized text label', () => {
        expect(FOOD_SCAN_RECOGNIZED_TEXT_LABEL).toBe('Texto identificado na imagem');
        expect(FOOD_SCAN_RECOGNIZED_TEXT_LABEL.toLowerCase()).not.toContain('ocr');
    });
});
