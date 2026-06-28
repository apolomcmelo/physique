import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme';

interface LevelIndicatorProps {
    x: number;
    y: number;
}

const SIZE = 80;
const DOT_SIZE = 16;
const MAX_OFFSET = (SIZE - DOT_SIZE) / 2 - 4;

export const LevelIndicator = ({ x, y }: LevelIndicatorProps) => {
    const isLevel = Math.abs(x) < 0.1 && Math.abs(y) < 0.1;

    const clamp = (val: number) =>
        Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, val * MAX_OFFSET));

    const offsetX = isLevel ? 0 : clamp(x);
    const offsetY = isLevel ? 0 : clamp(y);
    const dotColor = isLevel ? Colors.success : Colors.error;

    return (
        <View style={styles.container}>
            <View style={styles.crosshairH} />
            <View style={styles.crosshairV} />
            <View
                style={[
                    styles.dot,
                    { backgroundColor: dotColor, transform: [{ translateX: offsetX }, { translateY: offsetY }] },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    crosshairH: {
        position: 'absolute',
        width: SIZE,
        height: 1,
        backgroundColor: Colors.border,
    },
    crosshairV: {
        position: 'absolute',
        width: 1,
        height: SIZE,
        backgroundColor: Colors.border,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
    },
});
