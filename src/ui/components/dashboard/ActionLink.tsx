import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface ActionLinkProps {
    label: string;
    accent: string;
    onPress: () => void;
    variant?: 'link' | 'button';
}

export const ActionLink = ({ label, accent, onPress, variant = 'link' }: ActionLinkProps) => (
    <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
            styles.base,
            variant === 'button' && [styles.button, { borderColor: `${accent}4D` }],
            pressed && styles.pressed,
        ]}
    >
        <Typography variant="label" color={accent} style={styles.label}>{label}</Typography>
        <MaterialIcons name="arrow-forward" size={14} color={accent} />
    </Pressable>
);

const styles = StyleSheet.create({
    base: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    button: {
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    pressed: { opacity: 0.75 },
    label: { textTransform: 'none', letterSpacing: 0 },
});
