import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: Variant;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
}

export const Button = ({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    style,
}: ButtonProps) => {
    const containerStyle = [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        style,
    ];

    const textColor = variant === 'ghost' ? Colors.primary : Colors.white;

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.75}
        >
            {loading ? (
                <ActivityIndicator color={textColor} size="small" />
            ) : (
                <Text style={[Typography.h4, { color: textColor }]}>{label}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    primary: {
        backgroundColor: Colors.primary,
    },
    secondary: {
        backgroundColor: Colors.surfaceElevated,
    },
    ghost: {
        backgroundColor: Colors.transparent,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    danger: {
        backgroundColor: Colors.error,
    },
    disabled: {
        opacity: 0.4,
    },
});
