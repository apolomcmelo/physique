import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface FilterChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
    testID?: string;
    dotColor?: string;
}

export const FilterChip = ({ label, active, onPress, testID, dotColor }: FilterChipProps) => (
    <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.chip, active && styles.active]}
    >
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <Typography
            variant="label"
            color={active ? Colors.primary : Colors.textSecondary}
            style={styles.label}
        >
            {label}
        </Typography>
    </Pressable>
);

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: Spacing.sm + 4,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surface,
    },
    active: { backgroundColor: 'rgba(117, 255, 158, 0.12)', borderColor: 'rgba(117, 255, 158, 0.4)' },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { textTransform: 'none', letterSpacing: 0 },
});
