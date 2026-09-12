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

    const clearTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const start = useCallback((durationSecs: number) => {
        clearTimer();
        secondsRef.current = durationSecs;
        setSeconds(durationSecs);
        setIsRunning(true);
        void playTimerCue(durationSecs);

        intervalRef.current = setInterval(() => {
            const next = Math.max(0, secondsRef.current - 1);
            secondsRef.current = next;
            setSeconds(next);
            void playTimerCue(next);
            if (next === 0) {
                clearTimer();
                setIsRunning(false);
            }
        }, 1000);
    }, []);

    const stop = useCallback(() => {
        clearTimer();
        setIsRunning(false);
    }, []);

    const reset = useCallback(() => {
        clearTimer();
        setSeconds(0);
        setIsRunning(false);
    }, []);

    useEffect(() => {
        return () => clearTimer();
    }, []);

    return { seconds, isRunning, start, stop, reset };
};
