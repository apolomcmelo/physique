import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Exercise } from '../../../domain/entities/Workout';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { exerciseQueueStatus, queueDetail, QueueStatus } from '../../utils/sessionProgress';

interface SessionQueueProps {
    exercises: Exercise[];
    currentIndex: number;
    finalSetRecorded: boolean;
    currentSet: number;
    totalSets: number;
    currentWeight: string;
}

const STATUS_LABEL: Record<QueueStatus, string> = {
    done: 'Concluído', current: 'ATUAL', next: 'A seguir', pending: 'Pendente',
};

const Row = ({ exercise, index, status, ...rest }: {
    exercise: Exercise; index: number; status: QueueStatus;
    currentSet: number; totalSets: number; currentWeight: string;
}) => {
    const active = status === 'current';
    const done = status === 'done';
    const accent = active ? Colors.primary : status === 'next' ? Colors.secondary : Colors.textDisabled;
    return (
        <View style={[styles.row, active && styles.rowActive, done && styles.rowDone]}>
            <View style={styles.marker}>
                {done ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    : active ? <View style={styles.pulse} />
                        : <Text style={[styles.number, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text>}
            </View>
            <View style={styles.content}>
                <View style={styles.head}>
                    <Text style={[styles.name, active && { color: Colors.primary }, done && styles.struck]} numberOfLines={1}>
                        {exercise.name}
                    </Text>
                    <Text style={[styles.status, { color: done ? Colors.primary : accent }]}>{STATUS_LABEL[status]}</Text>
                </View>
                {active ? (
                    <>
                        <Text style={styles.activeLine}>EM ANDAMENTO • Série {rest.currentSet} de {rest.totalSets}</Text>
                        {rest.currentWeight ? <Text style={styles.detail}>Carga atual: {rest.currentWeight} kg</Text> : null}
                    </>
                ) : <Text style={styles.detail}>{queueDetail(exercise, status)}</Text>}
            </View>
        </View>
    );
};

export const SessionQueue = ({ exercises, currentIndex, finalSetRecorded, ...rest }: SessionQueueProps) => (
    <View style={styles.panel}>
        <View style={styles.header}>
            <View style={styles.title}>
                <Ionicons name="list" size={18} color={Colors.primary} />
                <Text style={styles.titleText}>Fila da Sessão</Text>
            </View>
            <View style={styles.count}><Text style={styles.countText}>{exercises.length} {exercises.length === 1 ? "Exercício" : "Exercícios"}</Text></View>
        </View>
        <View style={styles.list}>
            {exercises.map((exercise, index) => (
                <Row
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    status={exerciseQueueStatus(index, currentIndex, finalSetRecorded)}
                    {...rest}
                />
            ))}
        </View>
    </View>
);

export const QueueAction = ({ label, onPress, danger, loading }: { label: string; onPress: () => void; danger?: boolean; loading?: boolean }) => (
    <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={loading}
        style={[styles.action, danger && styles.actionDanger, loading && { opacity: 0.6 }]}
    >
        <Text style={[styles.actionText, danger && { color: Colors.error }]}>{label}</Text>
    </Pressable>
);

const styles = StyleSheet.create({
    panel: {
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceContainer,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    title: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    titleText: { ...Typography.h3, color: Colors.textPrimary },
    count: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, backgroundColor: Colors.surfaceHighest },
    countText: { ...Typography.labelMono, color: Colors.textSecondary, textTransform: 'none' },
    list: { gap: Spacing.sm },
    row: {
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surface,
    },
    rowActive: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
    rowDone: { opacity: 0.75 },
    marker: { width: 22, alignItems: 'center', paddingTop: 2 },
    pulse: { width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: Colors.primary },
    number: { ...Typography.metricSm, fontWeight: '700' },
    content: { flex: 1, minWidth: 0 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    name: { ...Typography.h4, color: Colors.textPrimary, flexShrink: 1 },
    struck: { textDecorationLine: 'line-through' },
    status: { ...Typography.labelMono, textTransform: 'none' },
    activeLine: { ...Typography.labelMono, color: Colors.textPrimary, textTransform: 'none', marginTop: 4 },
    detail: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
    action: {
        alignItems: 'center',
        paddingVertical: Spacing.sm + 2,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceContainer,
    },
    actionDanger: { borderColor: Colors.error },
    actionText: { ...Typography.metricSm, color: Colors.textPrimary },
});
