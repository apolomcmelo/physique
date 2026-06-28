import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
}

export const Card = ({ children, style, onPress }: CardProps) => {
    if (onPress) {
        return (
            <TouchableOpacity
                style={[styles.card, style]}
                onPress={onPress}
                activeOpacity={0.75}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
});
