import { useCallback, useEffect, useRef, useState } from 'react';

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

    const clearTimer = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const start = useCallback((durationSecs: number) => {
        clearTimer();
        setSeconds(durationSecs);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            setSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    setIsRunning(false);
                    return 0;
                }
                return prev - 1;
            });
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
