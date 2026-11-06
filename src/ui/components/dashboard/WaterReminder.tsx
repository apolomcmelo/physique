import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface WaterReminderProps {
    confirmed: boolean;
    onConfirm: () => void;
}

export const WaterReminder = ({ confirmed, onConfirm }: WaterReminderProps) => (
    <View style={styles.container}>
        <View style={styles.iconBox}>
            <MaterialIcons name="water-drop" size={20} color={Colors.secondary} />
        </View>
        <Typography variant="h4" color={confirmed ? Colors.primary : Colors.textPrimary} style={styles.question}>
            {confirmed ? 'Excelente 😌' : 'Já bebeu água hoje?'}
        </Typography>
        {confirmed ? (
            <View style={[styles.button, styles.confirmed]}>
                <MaterialIcons name="check" size={14} color={Colors.primary} />
                <Typography variant="label" color={Colors.primary} style={styles.buttonLabel}>Registrado</Typography>
            </View>
        ) : (
            <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={({ pressed }) => [styles.button, styles.confirm, pressed && styles.pressed]}
            >
                <Typography variant="label" color={Colors.onSecondary} style={styles.buttonLabel}>Sim</Typography>
            </Pressable>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        backgroundColor: `${Colors.secondary}1A`,
        borderWidth: 1,
        borderColor: `${Colors.secondary}4D`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    question: { flexShrink: 1, fontSize: 14 },
    button: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 6 },
    confirm: { backgroundColor: Colors.secondary },
    confirmed: { backgroundColor: `${Colors.primary}1A`, borderWidth: 1, borderColor: `${Colors.primary}4D` },
    pressed: { opacity: 0.8 },
    buttonLabel: { textTransform: 'none', fontWeight: '700' },
});
