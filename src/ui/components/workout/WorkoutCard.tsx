import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Workout, WorkoutType } from '../../../domain/entities/Workout';
import {
    estimateDurationMinutes,
    exerciseDetail,
    totalSets,
    weekdayLabel,
} from '../../utils/workoutSummary';
import { WORKOUT_TYPE_LABEL } from '../../utils/workoutTypeLabel';
import { Colors, Radius, Spacing } from '../../theme';
import { Card } from '../Card';
import { IconButton } from '../IconButton';
import { Typography } from '../Typography';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export const WORKOUT_TYPE_ACCENT: Record<WorkoutType, string> = {
    Weightlifting: Colors.primary,
    Calisthenics: Colors.secondary,
    HIT: Colors.tertiary,
};

const TYPE_ICON: Record<WorkoutType, IconName> = {
    Weightlifting: 'fitness-center',
    Calisthenics: 'sports-gymnastics',
    HIT: 'timer',
};

const PREVIEW_LIMIT = 3;

interface WorkoutCardProps {
    workout: Workout;
    isToday: boolean;
    onOpen: () => void;
    onStart: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const Metric = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <View style={styles.metric}>
        <Typography variant="labelMono" color={Colors.textSecondary}>{label}</Typography>
        <Typography variant="metricSm" color={accent ?? Colors.textPrimary}>{value}</Typography>
    </View>
);

export const WorkoutCard = ({ workout, isToday, onOpen, onStart, onEdit, onDelete }: WorkoutCardProps) => {
    const accent = WORKOUT_TYPE_ACCENT[workout.type];
    const duration = estimateDurationMinutes(workout);
    const weekday = weekdayLabel(workout.scheduledAt);
    const preview = workout.exercises.slice(0, PREVIEW_LIMIT);

    return (
        <Card
            testID={`workout-card-${workout.id}`}
            style={[styles.card, isToday && { borderColor: `${accent}66`, borderLeftWidth: 4, borderLeftColor: accent }] as never}
            onPress={onOpen}
        >
            <View style={styles.header}>
                <View style={[styles.badge, { backgroundColor: `${accent}1A`, borderColor: `${accent}4D` }]}>
                    <MaterialIcons name={TYPE_ICON[workout.type]} size={14} color={accent} />
                    <Typography variant="labelMono" color={accent} style={styles.noTransform}>
                        {WORKOUT_TYPE_LABEL[workout.type]}
                    </Typography>
                </View>
                {isToday && (
                    <View style={[styles.badge, { backgroundColor: Colors.surfaceElevated, borderColor: `${accent}4D` }]}>
                        <Typography variant="labelMono" color={accent}>HOJE</Typography>
                    </View>
                )}
            </View>

            <Typography variant="h4" color={Colors.textPrimary}>{workout.name}</Typography>

            <View style={styles.days}>
                {weekday ? (
                    <View style={[styles.dayChip, isToday && { backgroundColor: `${accent}33`, borderColor: `${accent}66` }]}>
                        <Typography variant="labelMono" color={isToday ? accent : Colors.textSecondary} style={styles.noTransform}>
                            {weekday}
                        </Typography>
                    </View>
                ) : (
                    <View style={styles.dayChip}>
                        <Typography variant="labelMono" color={Colors.textDisabled} style={styles.noTransform}>
                            Sem agendamento
                        </Typography>
                    </View>
                )}
            </View>

            <View style={styles.metrics}>
                <Metric label="Duração" value={duration === null ? '—' : `${duration} min`} />
                <Metric label="Exercícios" value={`${workout.exercises.length} mov.`} />
                <Metric label="Volume" value={`${totalSets(workout)} séries`} accent={accent} />
            </View>

            {preview.length > 0 && (
                <View style={styles.preview}>
                    <Typography variant="labelMono" color={Colors.textSecondary}>Sequência prevista</Typography>
                    {preview.map((exercise, index) => (
                        <View key={exercise.id} style={styles.previewRow}>
                            <View style={styles.previewName}>
                                <Typography variant="bodySmall" color={Colors.textSecondary}>
                                    {`${index + 1}. ${exercise.name}`}
                                </Typography>
                            </View>
                            <Typography variant="labelMono" color={Colors.textPrimary} style={styles.noTransform}>
                                {exerciseDetail(exercise)}
                            </Typography>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onStart}
                    style={[styles.start, isToday ? { backgroundColor: accent } : styles.startSecondary]}
                >
                    <MaterialIcons name="play-arrow" size={16} color={isToday ? Colors.onPrimary : Colors.textPrimary} />
                    <Typography
                        variant="label"
                        color={isToday ? Colors.onPrimary : Colors.textPrimary}
                        style={styles.noTransform}
                    >
                        Iniciar Treino
                    </Typography>
                </Pressable>
                <IconButton
                    icon="pencil-outline"
                    onPress={onEdit}
                    size="medium"
                    color={Colors.textSecondary}
                    accessibilityLabel={`Editar ${workout.name}`}
                />
                <IconButton
                    icon="trash-outline"
                    onPress={onDelete}
                    size="medium"
                    color={Colors.error}
                    accessibilityLabel={`Excluir ${workout.name}`}
                />
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: { flex: 1, gap: Spacing.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    days: { flexDirection: 'row', gap: 6 },
    dayChip: {
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceContainer,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    metrics: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceLowest,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        borderRadius: Radius.md,
        padding: Spacing.sm,
    },
    metric: { flex: 1, gap: 2 },
    preview: { gap: 4, flex: 1 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
    previewName: { flex: 1 },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        paddingTop: Spacing.sm,
    },
    start: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
    },
    startSecondary: { backgroundColor: Colors.surfaceContainer, borderWidth: 1, borderColor: Colors.borderSubtle },
    noTransform: { textTransform: 'none', letterSpacing: 0 },
});
