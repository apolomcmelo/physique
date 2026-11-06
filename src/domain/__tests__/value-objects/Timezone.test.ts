import { getDeviceTimezone } from '../../value-objects/Timezone';

describe('getDeviceTimezone', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns the IANA time zone reported by the device', () => {
        expect(getDeviceTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });

    it('falls back to UTC when the device does not report a time zone', () => {
        jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
            .mockReturnValue({ timeZone: '' } as Intl.ResolvedDateTimeFormatOptions);
        expect(getDeviceTimezone()).toBe('UTC');
    });
});
