import { hasBrowserCameraSupport, shouldOpenInAppCamera } from '../food/capture';

describe('food capture mode selection', () => {
    it('does not use in-app camera on web even when browser camera API exists', () => {
        expect(
            shouldOpenInAppCamera('web', {
                getUserMedia: () => Promise.resolve(undefined),
            }),
        ).toBe(false);
    });

    it('does not use in-app camera on web when browser camera API is missing', () => {
        expect(shouldOpenInAppCamera('web', undefined)).toBe(false);
        expect(shouldOpenInAppCamera('web', {})).toBe(false);
    });

    it('treats native platforms as camera-supported and uses in-app camera flow', () => {
        expect(hasBrowserCameraSupport('ios', undefined)).toBe(true);
        expect(shouldOpenInAppCamera('ios', undefined)).toBe(true);
    });
});
