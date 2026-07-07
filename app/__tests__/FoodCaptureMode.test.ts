import { hasBrowserCameraSupport, shouldOpenInAppCamera } from '../food/capture';

describe('food capture mode selection', () => {
    it('uses in-app camera on web when browser camera API exists', () => {
        expect(
            shouldOpenInAppCamera('web', {
                getUserMedia: () => Promise.resolve(undefined),
            }),
        ).toBe(true);
    });

    it('does not use in-app camera on web when browser camera API is missing', () => {
        expect(shouldOpenInAppCamera('web', undefined)).toBe(false);
        expect(shouldOpenInAppCamera('web', {})).toBe(false);
    });

    it('treats native platforms as camera-supported and not in-app-web-flow', () => {
        expect(hasBrowserCameraSupport('ios', undefined)).toBe(true);
        expect(shouldOpenInAppCamera('ios', undefined)).toBe(false);
    });
});
