import { createWorker } from 'tesseract.js';
import { recognizeNutritionLabel } from '../ocr/TesseractOcrAdapter';

jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));

const mockRecognize = jest.fn();
const mockTerminate = jest.fn(async () => {});
const mockCreateWorker = jest.mocked(createWorker);

beforeEach(() => {
    mockRecognize.mockReset();
    mockTerminate.mockClear();
    mockCreateWorker.mockReset();
    mockCreateWorker.mockResolvedValue({
        recognize: mockRecognize,
        terminate: mockTerminate,
    } as unknown as Awaited<ReturnType<typeof createWorker>>);
});

it('preserves zero and decimal comma values recognized from nutrition labels', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'Calorias 0 kcal\nProteínas 2,5 g' } });

    const result = await recognizeNutritionLabel('label.png');

    expect(result.nutritionData.calories).toBe(0);
    expect(result.nutritionData.proteinGrams).toBe(2.5);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
});

it('does not accept a truncated decimal from malformed OCR text', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'Calorias 123,4.5 kcal' } });

    const result = await recognizeNutritionLabel('label.png');

    expect(result.nutritionData.calories).toBeUndefined();
    expect(mockTerminate).toHaveBeenCalledTimes(1);
});
