import { shouldTakeMonthlyPhotos } from '../../use-cases/photo/ShouldTakeMonthlyPhotos';
import { BodyPhoto } from '../../entities/BodyPhoto';

function makePhoto(angle: BodyPhoto['angle'], monthYear: string): BodyPhoto {
    return {
        id: `photo-${angle}`,
        userId: 'user-1',
        capturedAt: new Date(2024, 0, 1),
        angle,
        fileUrl: 'https://example.com/photo.jpg',
        accelerometerX: 0,
        accelerometerY: 0,
        accelerometerZ: 9.8,
        latitude: null,
        longitude: null,
        luminosity: null,
        monthYear,
    };
}

describe('shouldTakeMonthlyPhotos', () => {
    it('returns true on day 1 of month with no photos for current month', () => {
        const now = new Date(2024, 0, 1); // January 1, 2024
        const result = shouldTakeMonthlyPhotos([], now);
        expect(result).toBe(true);
    });

    it('returns true on day 1 of month with only 2 angles covered', () => {
        const now = new Date(2024, 0, 1); // January 1, 2024
        const photos = [makePhoto('front', '2024-01'), makePhoto('back', '2024-01')];

        const result = shouldTakeMonthlyPhotos(photos, now);
        expect(result).toBe(true);
    });

    it('returns false on day 2 of month (not day 1)', () => {
        const now = new Date(2024, 0, 2); // January 2, 2024
        const result = shouldTakeMonthlyPhotos([], now);
        expect(result).toBe(false);
    });

    it('returns false on day 1 when all 4 angles already have photos for current month', () => {
        const now = new Date(2024, 0, 1); // January 1, 2024
        const photos = [
            makePhoto('front', '2024-01'),
            makePhoto('back', '2024-01'),
            makePhoto('left', '2024-01'),
            makePhoto('right', '2024-01'),
        ];

        const result = shouldTakeMonthlyPhotos(photos, now);
        expect(result).toBe(false);
    });
});
