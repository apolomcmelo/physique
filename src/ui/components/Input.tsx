import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    KeyboardTypeOptions,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface InputProps {
    label?: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: KeyboardTypeOptions;
    secureTextEntry?: boolean;
    multiline?: boolean;
    style?: ViewStyle;
}

export const Input = ({
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType = 'default',
    secureTextEntry = false,
    multiline = false,
    style,
}: InputProps) => {
    return (
        <View style={[styles.container, style]}>
            {label && (
                <Text style={[Typography.label, styles.label]}>{label}</Text>
            )}
            <TextInput
                style={[styles.input, multiline && styles.multiline]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.textDisabled}
                keyboardType={keyboardType}
                secureTextEntry={secureTextEntry}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: Spacing.xs,
    },
    label: {
        color: Colors.textSecondary,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        color: Colors.textPrimary,
        fontSize: 14,
        minHeight: 48,
    },
    multiline: {
        minHeight: 96,
        paddingTop: Spacing.sm + 2,
    },
});
