import { useCallback, useEffect, useRef, useState } from 'react';
import { playTimerCue } from '../utils/sound';

interface WorkoutTimerState {
    seconds: number;
    isRunning: boolean;
    start: (durationSecs: number) => void;
    stop: () => void;
    reset: () => void;
}

export const useWorkoutTimer = (): WorkoutTimerState => {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const secondsRef = useRef(0);
    const deadlineRef = useRef<number | null>(null);
    const lastCueRef = useRef<number | null>(null);

    const clearTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const start = useCallback((durationSecs: number) => {
        clearTimer();
        secondsRef.current = durationSecs;
        deadlineRef.current = Date.now() + durationSecs * 1000;
        lastCueRef.current = null;
        setSeconds(durationSecs);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            const next = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
            secondsRef.current = next;
            setSeconds(next);
            if (next > 0 && next !== lastCueRef.current && next <= 5) {
                lastCueRef.current = next;
                void playTimerCue(next);
            }
            if (next === 0) {
                if ((deadlineRef.current ?? 0) >= Date.now() - 1500) void playTimerCue(0);
                clearTimer();
                setIsRunning(false);
            }
        }, 1000);
    }, []);

    const stop = useCallback(() => {
        clearTimer();
        deadlineRef.current = null;
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        clearTimer();
        deadlineRef.current = null;
        setSeconds(0);
        setIsRunning(false);
    }, []);

    useEffect(() => {
        return () => clearTimer();
    }, []);

    return { seconds, isRunning, start, stop, reset };
};
