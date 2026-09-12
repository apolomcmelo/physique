import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { playTimerCue } from '../utils/sound';

interface WorkoutTimerProps {
    durationSeconds: number;
    onComplete: () => void;
    autoStart?: boolean;
}

export const WorkoutTimer = ({
    durationSeconds,
    onComplete,
    autoStart = false,
}: WorkoutTimerProps) => {
    const [remaining, setRemaining] = useState(durationSeconds);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    useEffect(() => {
        setRemaining(durationSeconds);
    }, [durationSeconds]);

    useEffect(() => {
        if (!autoStart) return;

        intervalRef.current = setInterval(() => {
            setRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoStart, durationSeconds]);

    useEffect(() => {
        if (!autoStart) return;
        void playTimerCue(remaining);
        if (remaining !== 0) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        onCompleteRef.current();
    }, [autoStart, remaining]);

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
