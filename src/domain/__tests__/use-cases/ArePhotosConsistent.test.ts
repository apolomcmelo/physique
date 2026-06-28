import { arePhotosConsistent } from '../../use-cases/photo/ArePhotosConsistent';

type PhotoSensorData = {
    accelerometerX: number;
    accelerometerY: number;
    accelerometerZ: number;
    latitude: number | null;
    longitude: number | null;
    luminosity: number | null;
};

const baseData: PhotoSensorData = {
    accelerometerX: 0.0,
    accelerometerY: 0.0,
    accelerometerZ: 9.8,
    latitude: -23.5,
    longitude: -46.6,
    luminosity: 100,
};

describe('arePhotosConsistent', () => {
    it('returns consistent: true when all values are within tolerance', () => {
        const current = { ...baseData, accelerometerX: 0.1, accelerometerY: 0.1 };
        const previous = { ...baseData, accelerometerX: 0.0, accelerometerY: 0.0 };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(true);
        expect(result.reasons).toHaveLength(0);
    });

    it('returns consistent: false with reason when accelerometer X differs by more than 0.3', () => {
        const current = { ...baseData, accelerometerX: 1.0 };
        const previous = { ...baseData, accelerometerX: 0.0 };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(false);
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.reasons[0]).toContain('Accelerometer X');
    });

    it('returns consistent: false with reason when accelerometer Y differs by more than 0.3', () => {
        const current = { ...baseData, accelerometerY: 1.0 };
        const previous = { ...baseData, accelerometerY: 0.0 };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(false);
        expect(result.reasons.some((r) => r.includes('Accelerometer Y'))).toBe(true);
    });

    it('returns consistent: false with reason when location differs by more than 50m', () => {
        // 0.001 degree of latitude ≈ 111m, well above the 50m tolerance
        const current = { ...baseData, latitude: -23.5 };
        const previous = { ...baseData, latitude: -23.501 };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(false);
        expect(result.reasons.some((r) => r.includes('Location'))).toBe(true);
    });

    it('returns consistent: false with reason when luminosity differs by more than 30', () => {
        const current = { ...baseData, luminosity: 150 };
        const previous = { ...baseData, luminosity: 100 };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(false);
        expect(result.reasons.some((r) => r.includes('Luminosity'))).toBe(true);
    });

    it('returns consistent: true when latitude/longitude are null (skips location check)', () => {
        const current = { ...baseData, latitude: null, longitude: null };
        const previous = { ...baseData, latitude: null, longitude: null };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(true);
    });

    it('returns consistent: true when luminosity is null (skips luminosity check)', () => {
        const current = { ...baseData, luminosity: null };
        const previous = { ...baseData, luminosity: null };

        const result = arePhotosConsistent(current, previous);

        expect(result.consistent).toBe(true);
    });
});
