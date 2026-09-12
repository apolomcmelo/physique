import React from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Workout, WorkoutType } from '../../domain/entities/Workout';
import { Button } from './Button';
import { Typography as TypographyText } from './Typography';
import { Colors, Radius, Spacing, Typography } from '../theme';

interface WorkoutDetailModalProps {
    visible: boolean;
    workout: Workout | null;
    onClose: () => void;
    onEdit?: (workout: Workout) => void;
    onStart?: (workout: Workout) => void;
}

const TYPE_LABEL: Record<WorkoutType, string> = {
    HIT: 'HIT',
    Calisthenics: 'Calistenia',
    Weightlifting: 'Musculação',
};

const TYPE_COLOR: Record<WorkoutType, string> = {
    HIT: Colors.error,
    Calisthenics: Colors.primary,
    Weightlifting: Colors.warning,
};

function formatSchedule(date: Date | null): string {
    if (!date) return 'Sem agendamento';
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
}

function exercisePrescription(sets: number | null, reps: number | null, duration: number | null): string {
    const setLabel = sets === 1 ? 'série' : 'séries';
    if (duration !== null) return `${sets ?? 1} ${setLabel} x ${formatDuration(duration)}`;
    if (reps !== null) return `${sets ?? 1} ${setLabel} x ${reps} reps`;
    return `${sets ?? 1} ${setLabel}`;
}

function estimateDuration(workout: Workout): number {
    return workout.exercises.reduce((total, exercise) => {
        const work = (exercise.durationSeconds ?? 0) * (exercise.sets ?? 1);
        const betweenSets = (exercise.restSecondsBetweenSets ?? 0) * Math.max(0, (exercise.sets ?? 1) - 1);
        const transition = exercise.restSecondsBeforeNextExercise ?? 0;
        return total + work + betweenSets + transition;
    }, 0);
}

export function WorkoutDetailModal({
    visible,
    workout,
    onClose,
    onEdit,
    onStart,
}: WorkoutDetailModalProps) {
    if (!workout) return null;

    const estimatedSeconds = estimateDuration(workout);
    const totalSets = workout.exercises.reduce((total, exercise) => total + (exercise.sets ?? 0), 0);
    const typeColor = TYPE_COLOR[workout.type];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.dialog}>
                    <View style={styles.header}>
                        <View style={styles.headerCopy}>
                            <TypographyText variant="h2" color={Colors.textPrimary}>
                                {workout.name}
                            </TypographyText>
                            <View style={styles.metaRow}>
                                <View style={[styles.typeBadge, { borderColor: typeColor, backgroundColor: `${typeColor}22` }]}>
                                    <Text style={[Typography.label, { color: typeColor }]}>{TYPE_LABEL[workout.type]}</Text>
                                </View>
                                <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                    {formatSchedule(workout.scheduledAt)}
                                </TypographyText>
                            </View>
                        </View>
                        <TouchableOpacity
                            accessibilityLabel="Fechar detalhes do treino"
                            accessibilityRole="button"
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.summaryRow}>
                            <SummaryItem label="Exercícios" value={String(workout.exercises.length)} />
                            <SummaryItem label="Séries" value={String(totalSets)} />
                            <SummaryItem label="Duração estimada" value={estimatedSeconds ? formatDuration(estimatedSeconds) : '—'} />
                        </View>

                        {workout.exercises.length === 0 ? (
                            <TypographyText variant="body" color={Colors.textDisabled}>
                                Nenhum exercício cadastrado.
                            </TypographyText>
                        ) : (
                            workout.exercises.map((exercise, index) => (
                                <View key={exercise.id} style={styles.exerciseCard}>
                                    <View style={styles.exerciseTitleRow}>
                                        <View style={styles.orderBadge}>
                                            <Text style={styles.orderText}>{index + 1}</Text>
                                        </View>
                                        <TypographyText variant="h4" color={Colors.textPrimary} style={styles.exerciseName}>
                                            {exercise.name}
                                        </TypographyText>
                                    </View>
                                    <TypographyText variant="body" color={Colors.primary} style={styles.prescription}>
                                        {exercisePrescription(exercise.sets, exercise.repsPerSet, exercise.durationSeconds)}
                                    </TypographyText>
                                    <View style={styles.tagRow}>
                                        {exercise.weightKg !== null && (
                                            <DetailTag label={`${exercise.weightKg} kg`} />
                                        )}
                                        {exercise.restSecondsBetweenSets !== null && (
                                            <DetailTag label={`Descanso: ${exercise.restSecondsBetweenSets}s`} />
                                        )}
                                        {exercise.restSecondsBeforeNextExercise !== null && (
                                            <DetailTag label={`Transição: ${exercise.restSecondsBeforeNextExercise}s`} />
                                        )}
                                    </View>
                                    {exercise.notes ? (
                                        <TypographyText variant="bodySmall" color={Colors.textSecondary} style={styles.notes}>
                                            {exercise.notes}
                                        </TypographyText>
                                    ) : null}
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        {onEdit ? (
                            <Button
                                label="Editar"
                                variant="ghost"
                                onPress={() => onEdit(workout)}
                                style={styles.footerButton}
                            />
                        ) : null}
                        {onStart ? (
                            <Button
                                label="Iniciar Treino"
                                onPress={() => onStart(workout)}
                                style={styles.footerButton}
                            />
                        ) : null}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryItem}>
            <TypographyText variant="h4" color={Colors.textPrimary}>{value}</TypographyText>
            <TypographyText variant="bodySmall" color={Colors.textSecondary}>{label}</TypographyText>
        </View>
    );
}

function DetailTag({ label }: { label: string }) {
    return (
        <View style={styles.detailTag}>
            <TypographyText variant="bodySmall" color={Colors.textSecondary}>{label}</TypographyText>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    dialog: {
        maxHeight: '92%',
        backgroundColor: Colors.background,
        borderTopLeftRadius: Radius.lg,
        borderTopRightRadius: Radius.lg,
        paddingTop: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerCopy: { flex: 1, gap: Spacing.xs },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
    typeBadge: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
    closeButton: { padding: Spacing.xs, marginLeft: Spacing.sm },
    closeText: { color: Colors.textSecondary, fontSize: 30, lineHeight: 30, fontWeight: '300' },
    scroll: { flexShrink: 1 },
    content: { padding: Spacing.md, gap: Spacing.sm },
    summaryRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.md },
    summaryItem: { flex: 1, gap: 2 },
    exerciseCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
    exerciseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    orderBadge: { width: 28, height: 28, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    orderText: { color: Colors.white, fontWeight: '700' },
    exerciseName: { flex: 1 },
    prescription: { marginLeft: 36 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginLeft: 36 },
    detailTag: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 3 },
    notes: { marginLeft: 36, fontStyle: 'italic' },
    footer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
    footerButton: { flex: 1 },
});
