import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { playTimerCue } from '../utils/sound';

interface WorkoutTimerProps {
    durationSeconds: number;
    onComplete: () => void;
    autoStart?: boolean;
    deadline?: number;
}

export const WorkoutTimer = ({
    durationSeconds,
    onComplete,
    autoStart = false,
    deadline,
}: WorkoutTimerProps) => {
    const [remaining, setRemaining] = useState(durationSeconds);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const deadlineRef = useRef<number | null>(null);
    const lastCueRef = useRef<number | null>(null);
    const completedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        setRemaining(durationSeconds);
    }, [durationSeconds]);

    useEffect(() => {
        if (!autoStart || deadline === undefined) return;
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, [deadline, autoStart]);

    useEffect(() => {
        if (!autoStart) return;
        deadlineRef.current = deadline ?? Date.now() + durationSeconds * 1000;
        completedRef.current = false;
        lastCueRef.current = null;
        setRemaining(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - ((deadlineRef.current ?? Date.now()) - durationSeconds * 1000);
            const next = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
            setRemaining(next);
            if (next <= 5 && next >= 1 && next !== lastCueRef.current && Math.abs((deadlineRef.current ?? 0) - Date.now() - next * 1000) < 1500) {
                lastCueRef.current = next;
                void playTimerCue(next);
            }
            if (next === 0 && !completedRef.current) {
                completedRef.current = true;
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (elapsed <= durationSeconds * 1000 + 1500) void playTimerCue(0);
                onCompleteRef.current();
            }
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoStart, durationSeconds, deadline]);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const isExpired = remaining === 0;

    return (
        <View style={styles.container}>
            <View style={[styles.circle, isExpired && styles.circleComplete]}>
                <Text style={[Typography.h1, styles.time]}>{display}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        width: '62%',
        maxWidth: 180,
        aspectRatio: 1,
        borderRadius: 999,
        borderWidth: 4,
        borderColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceElevated,
    },
    circleComplete: {
        borderColor: Colors.success,
    },
    time: {
        color: Colors.textPrimary,
        letterSpacing: 2,
    },
});
