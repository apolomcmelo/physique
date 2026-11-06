import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Workout } from '../../../domain/entities/Workout';
import { Colors, Spacing } from '../../theme';
import { WORKOUT_TYPE_LABEL } from '../../utils/workoutTypeLabel';
import { Card } from '../Card';
import { Typography } from '../Typography';
import { ActionLink } from './ActionLink';
import { AgendaFooter } from './AgendaFooter';
import { Chip } from './Chip';
import { DashboardCardHeader } from './DashboardCardHeader';
import { formatDate, formatDayLabel, formatMinutesUntil, formatTime } from './format';

interface NextWorkoutCardProps {
    workout: Workout | null;
    fallbackWorkout: Workout | null;
    now: Date;
    onOpen: () => void;
    style?: ViewStyle;
}

export const NextWorkoutCard = ({ workout, fallbackWorkout, now, onOpen, style }: NextWorkoutCardProps) => (
    <Card style={{ ...styles.card, ...style }}>
        <DashboardCardHeader
            icon="fitness-center"
            accent={Colors.primary}
            title="Próximo treino"
            badge={workout?.scheduledAt
                ? <Chip label={`${formatDayLabel(workout.scheduledAt, now)} • ${formatTime(workout.scheduledAt)}`} accent={Colors.primary} />
                : undefined}
        />
        {workout ? (
            <View style={styles.body}>
                <Typography variant="h3">{workout.name}</Typography>
                {workout.scheduledAt && (
                    <Typography variant="metricSm" color={Colors.primary}>{formatMinutesUntil(workout.scheduledAt, now)}</Typography>
                )}
            </View>
        ) : (
            <View style={styles.body}>
                <Typography variant="body" color={Colors.textDisabled}>Nenhum treino na próxima hora</Typography>
                {fallbackWorkout?.scheduledAt && (
                    <Typography variant="bodySmall" color={Colors.textSecondary}>
                        {`Próximo: ${fallbackWorkout.name} em ${formatDate(fallbackWorkout.scheduledAt)} às ${formatTime(fallbackWorkout.scheduledAt)}`}
                    </Typography>
                )}
            </View>
        )}
        <AgendaFooter
            icon="format-list-numbered"
            caption={workout ? `${workout.exercises.length} exercícios • ${WORKOUT_TYPE_LABEL[workout.type]}` : null}
            action={<ActionLink label="Ir para Treinos" accent={Colors.primary} onPress={onOpen} variant="button" />}
        />
    </Card>
);

const styles = StyleSheet.create({
    card: { padding: Spacing.lg, justifyContent: 'space-between', gap: Spacing.md, borderLeftWidth: 2, borderLeftColor: Colors.primary },
    body: { gap: Spacing.xs },
});
