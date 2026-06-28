import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface ProgressBarProps {
    current: number;
    goal: number;
    label?: string;
    showPercentage?: boolean;
}

export const ProgressBar = ({
    current,
    goal,
    label,
    showPercentage = false,
}: ProgressBarProps) => {
    const clamped = goal > 0 ? Math.min(current / goal, 1) : 0;
    const percentage = Math.round(clamped * 100);

    return (
        <View style={styles.container}>
            {(label || showPercentage) && (
                <View style={styles.header}>
                    {label && (
                        <Text style={[Typography.label, { color: Colors.textSecondary }]}>
                            {label}
                        </Text>
                    )}
                    {showPercentage && (
                        <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                            {percentage}%
                        </Text>
                    )}
                </View>
            )}
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${percentage}%` }]} />
            </View>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
                {current} / {goal}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: Spacing.xs,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    track: {
        height: 8,
        backgroundColor: Colors.surfaceElevated,
        borderRadius: Radius.full,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
    },
});
