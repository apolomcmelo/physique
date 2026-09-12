import { getTimerCue } from '../sound';

describe('timer sound cues', () => {
    it('uses countdown cues only for the final five seconds', () => {
        expect(getTimerCue(6)).toBeNull();
        expect(getTimerCue(5)).toBe('countdown');
        expect(getTimerCue(1)).toBe('countdown');
    });

    it('uses a completion cue at zero', () => {
        expect(getTimerCue(0)).toBe('complete');
        expect(getTimerCue(-1)).toBeNull();
    });
});