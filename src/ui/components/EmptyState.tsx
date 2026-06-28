import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface EmptyStateProps {
    icon: string;
    title: string;
    message: string;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export const EmptyState = ({ icon, title, message, action }: EmptyStateProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[Typography.h3, { color: Colors.textPrimary, marginTop: Spacing.md }]}>
                {title}
            </Text>
            <Text
                style={[
                    Typography.body,
                    { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
                ]}
            >
                {message}
            </Text>
            {action && (
                <TouchableOpacity style={styles.button} onPress={action.onPress} activeOpacity={0.75}>
                    <Text style={[Typography.h4, { color: Colors.white }]}>{action.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    icon: {
        fontSize: 48,
    },
    button: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
    },
});
