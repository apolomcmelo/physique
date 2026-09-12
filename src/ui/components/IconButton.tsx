import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    AccessibilityRole,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Radius } from '../theme';

type IconName =
    | 'pencil-outline'
    | 'trash-outline'
    | 'add-outline'
    | 'play'
    | 'play-outline'
    | 'chevron-up'
    | 'chevron-down'
    | 'reorder-three'
    | 'close-outline';

type IconSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
    icon: IconName;
    onPress: () => void;
    disabled?: boolean;
    color?: string;
    size?: IconSize;
    style?: ViewStyle;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

const sizeMap: Record<IconSize, number> = {
    small: 16,
    medium: 20,
    large: 24,
};

const buttonSizeMap: Record<IconSize, number> = {
    small: 32,
    medium: 40,
    large: 48,
};

export const IconButton = ({
    icon,
    onPress,
    disabled = false,
    color = Colors.textPrimary,
    size = 'medium',
    style,
    accessible = true,
    accessibilityLabel,
    accessibilityHint,
}: IconButtonProps) => {
    const iconSize = sizeMap[size];
    const buttonSize = buttonSizeMap[size];

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    width: buttonSize,
                    height: buttonSize,
                },
                disabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.6}
            accessible={accessible}
            accessibilityRole={'button' as AccessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
        >
            <Ionicons
                name={icon}
                size={iconSize}
                color={disabled ? Colors.textDisabled : color}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Radius.md,
    },
    disabled: {
        opacity: 0.4,
    },
});
