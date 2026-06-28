import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

interface MacroRowProps {
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
}

export const MacroRow = ({ label, value, unit, color }: MacroRowProps) => {
    return (
        <View style={styles.row}>
            <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                {label}
            </Text>
            <Text style={[Typography.h4, { color: color ?? Colors.textPrimary }]}>
                {value}
                {unit && (
                    <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
                        {' '}{unit}
                    </Text>
                )}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
});
