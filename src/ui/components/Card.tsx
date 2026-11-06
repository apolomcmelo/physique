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
    testID?: string;
}

export const Card = ({ children, style, onPress, testID }: CardProps) => {
    if (onPress) {
        return (
            <TouchableOpacity
                testID={testID}
                style={[styles.card, style]}
                onPress={onPress}
                activeOpacity={0.75}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return <View testID={testID} style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.md,
    },
});
