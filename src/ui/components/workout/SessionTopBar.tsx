import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { formatElapsed } from '../../utils/sessionProgress';

interface SessionTopBarProps {
    workoutName: string;
    startedAt: Date;
    keepAwake: boolean;
    onToggleKeepAwake: () => void;
    onBack: () => void;
}

export const SessionTopBar = ({ workoutName, startedAt, keepAwake, onToggleKeepAwake, onBack }: SessionTopBarProps) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.bar}>
            <View style={styles.left}>
                <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={styles.back}>
                    <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                    <Text style={styles.backText}>Voltar</Text>
                </Pressable>
                <View style={styles.clock}>
                    <Ionicons name="timer-outline" size={16} color={Colors.primary} />
                    <Text style={styles.clockLabel}>Tempo de Treino:</Text>
                    <Text style={styles.clockValue}>{formatElapsed(now - startedAt.getTime())}</Text>
                </View>
                <Text style={styles.name} numberOfLines={1}>{workoutName}</Text>
            </View>
            <View style={styles.right}>
                <View style={styles.saved}>
                    <View style={styles.dot} />
                    <Text style={styles.savedText}>Progresso salvo</Text>
                </View>
                <Pressable
                    accessibilityRole="switch"
                    accessibilityLabel="Manter tela ativa"
                    accessibilityState={{ checked: keepAwake }}
                    onPress={onToggleKeepAwake}
                    style={[styles.wake, !keepAwake && styles.wakeOff]}
                >
                    <Ionicons name={keepAwake ? 'sunny' : 'sunny-outline'} size={14} color={keepAwake ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.wakeText, !keepAwake && { color: Colors.textSecondary }]}>
                        {keepAwake ? 'Tela Ativa' : 'Tela Padrão'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
        backgroundColor: Colors.surface,
    },
    left: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
    right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    back: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, paddingRight: Spacing.sm },
    backText: { ...Typography.metricSm, color: Colors.textSecondary },
    clock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceContainer,
    },
    clockLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
    clockValue: { ...Typography.metricSm, color: Colors.primary, letterSpacing: 1 },
    name: { ...Typography.labelMono, color: Colors.textDisabled, textTransform: 'none', flexShrink: 1 },
    saved: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceHighest,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    savedText: { ...Typography.labelMono, color: Colors.textPrimary, textTransform: 'none' },
    wake: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: Colors.surfaceHighest,
    },
    wakeOff: { borderColor: Colors.border, opacity: 0.7 },
    wakeText: { ...Typography.labelMono, color: Colors.primary, textTransform: 'none' },
});
