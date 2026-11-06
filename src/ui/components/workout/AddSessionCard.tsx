import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface AddSessionCardProps {
    onPress: () => void;
}

export const AddSessionCard = ({ onPress }: AddSessionCardProps) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
        <View style={styles.iconCircle}>
            <MaterialIcons name="add" size={24} color={Colors.textSecondary} />
        </View>
        <Typography variant="h4" color={Colors.textPrimary}>Adicionar Nova Sessão</Typography>
        <Typography variant="bodySmall" color={Colors.textSecondary} style={styles.message}>
            Planeje uma nova rotina ou crie sessões com sobrecarga progressiva.
        </Typography>
    </Pressable>
);

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.borderSubtle,
        backgroundColor: 'rgba(9, 14, 23, 0.4)',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceContainer,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    message: { textAlign: 'center', maxWidth: 280 },
});
