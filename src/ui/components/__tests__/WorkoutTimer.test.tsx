import React from 'react';
import { act, render } from '@testing-library/react-native';
import { WorkoutTimer } from '../WorkoutTimer';

jest.mock('../../utils/sound', () => ({ playTimerCue: jest.fn(async () => {}) }));
const { playTimerCue } = require('../../utils/sound');

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-25T10:00:00Z')); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());

it('uses a deadline rather than counting delayed interval callbacks', () => {
    const complete = jest.fn();
    const screen = render(<WorkoutTimer durationSeconds={45} onComplete={complete} autoStart />);
    expect(screen.getByText('00:45')).toBeTruthy();
    act(() => { jest.setSystemTime(new Date('2026-09-25T10:00:30Z')); jest.advanceTimersByTime(1000); });
    expect(screen.getByText('00:14')).toBeTruthy();
    act(() => { jest.setSystemTime(new Date('2026-09-25T10:02:00Z')); jest.advanceTimersByTime(1000); });
    expect(screen.getByText('00:00')).toBeTruthy();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(playTimerCue).not.toHaveBeenCalledWith(5);
});

it('never completes or emits late sounds after unmounting a running timer', () => {
    const complete = jest.fn();
    const screen = render(<WorkoutTimer durationSeconds={6} onComplete={complete} autoStart />);
    screen.unmount();
    act(() => jest.advanceTimersByTime(8000));
    expect(complete).not.toHaveBeenCalled();
});

it('plays the final five seconds once and a completion cue without repeating stale cues', () => {
    const complete = jest.fn();
    render(<WorkoutTimer durationSeconds={7} onComplete={complete} autoStart />);
    for (let second = 1; second <= 7; second += 1) {
        act(() => jest.advanceTimersByTime(1000));
    }
    expect(playTimerCue.mock.calls.map(([remaining]: [number]) => remaining)).toEqual([5, 4, 3, 2, 1, 0]);
    act(() => jest.advanceTimersByTime(2000));
    expect(complete).toHaveBeenCalledTimes(1);
});

it('does not emit expired sounds on return from the background', () => {
    const complete = jest.fn();
    render(<WorkoutTimer durationSeconds={45} onComplete={complete} autoStart />);
    act(() => { jest.setSystemTime(new Date('2026-09-25T10:02:00Z')); jest.advanceTimersByTime(1000); });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(playTimerCue).not.toHaveBeenCalled();
});

it('keeps the original deadline when the parent rerenders', () => {
    const complete = jest.fn();
    const deadline = Date.now() + 45000;
    const screen = render(<WorkoutTimer durationSeconds={45} deadline={deadline} onComplete={complete} autoStart />);
    act(() => jest.advanceTimersByTime(20000));
    screen.rerender(<WorkoutTimer durationSeconds={45} deadline={deadline} onComplete={complete} autoStart />);
    expect(screen.getByText('00:25')).toBeTruthy();
    act(() => jest.advanceTimersByTime(25000));
    expect(complete).toHaveBeenCalledTimes(1);
});
