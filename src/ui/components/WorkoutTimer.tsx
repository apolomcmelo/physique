import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

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
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    intervalRef.current = null;
                    onCompleteRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoStart, durationSeconds]);

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
        width: 140,
        height: 140,
        borderRadius: 70,
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
