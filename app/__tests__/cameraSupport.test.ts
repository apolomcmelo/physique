import { isCameraSupported } from '../camera/support';

describe('isCameraSupported', () => {
    it('allows native platforms without browser media devices', () => {
        expect(isCameraSupported('ios', null)).toBe(true);
        expect(isCameraSupported('android', undefined)).toBe(true);
    });

    it('requires getUserMedia on web', () => {
        expect(isCameraSupported('web', {})).toBe(false);
        expect(isCameraSupported('web', { getUserMedia: undefined })).toBe(false);
        expect(isCameraSupported('web', { getUserMedia: jest.fn() })).toBe(true);
    });
});
