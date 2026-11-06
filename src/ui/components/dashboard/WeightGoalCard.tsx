import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WeightGoal, WeightGoalProgress } from '../../../domain/entities/WeightGoal';
import { WeightRecord } from '../../../domain/entities/WeightRecord';
import { Colors, Radius, Spacing } from '../../theme';
import { Card } from '../Card';
import { Typography } from '../Typography';
import { Chip } from './Chip';
import { DashboardCardHeader } from './DashboardCardHeader';
import { formatDate, formatDecimal, formatSignedKg } from './format';

interface WeightGoalCardProps {
    latestWeight: WeightRecord | null;
    previousWeightKg: number | null;
    goal: WeightGoal | null;
    progress: WeightGoalProgress | null;
    style?: ViewStyle;
}

function remainingLabel(progress: WeightGoalProgress): string {
    const remaining = Math.abs(progress.remainingWeightKg);
    if (progress.progress >= 1 || Math.round(remaining * 10) === 0) return 'Meta atingida';
    return `Faltam ${formatDecimal(remaining)} kg para a meta`;
}

export const WeightGoalCard = ({ latestWeight, previousWeightKg, goal, progress, style }: WeightGoalCardProps) => {
    const currentWeight = latestWeight?.weightKg ?? null;
    const delta = currentWeight !== null && previousWeightKg !== null ? currentWeight - previousWeightKg : null;
    const percent = progress ? Math.round(progress.progress * 100) : 0;

    return (
        <Card style={{ ...styles.card, ...style }}>
            <DashboardCardHeader
                icon="monitor-weight"
                accent={Colors.primary}
                title="Peso Corporal & Meta"
                subtitle={latestWeight ? `Última aferição: ${formatDate(latestWeight.recordedAt)}` : 'Nenhuma aferição registrada'}
                badge={delta !== null ? <Chip label={`${formatSignedKg(delta)} vs anterior`} accent={Colors.primary} /> : undefined}
            />

            <View style={styles.values}>
                <View>
                    <Typography variant="labelMono" color={Colors.outline}>Peso atual</Typography>
                    <View style={styles.valueRow}>
                        <Typography variant="display" color={Colors.textPrimary}>
                            {currentWeight !== null ? formatDecimal(currentWeight) : '—'}
                        </Typography>
                        <Typography variant="metricMd" color={Colors.outline}>kg</Typography>
                    </View>
                </View>
                {goal && (
                    <View style={styles.goal}>
                        <Typography variant="labelMono" color={Colors.outline}>Meta final</Typography>
                        <View style={styles.valueRow}>
                            <Typography variant="metricLg" color={Colors.primary}>{formatDecimal(goal.targetWeightKg)}</Typography>
                            <Typography variant="metricMd" color={Colors.outline}>kg</Typography>
                        </View>
                    </View>
                )}
            </View>

            {goal && progress && (
                <View style={styles.progress}>
                    <View style={styles.progressRow}>
                        <Typography variant="labelMono" color={Colors.textSecondary} style={styles.caption}>Progresso do objetivo</Typography>
                        <Typography variant="labelMono" color={Colors.primary} style={styles.caption}>{`${percent}% concluído`}</Typography>
                    </View>
                    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}>
                        <View style={[styles.fill, { width: `${percent}%` }]} />
                    </View>
                    <View style={styles.progressRow}>
                        <Typography variant="labelMono" color={Colors.outline} style={styles.caption}>
                            {`Ponto de partida: ${formatDecimal(progress.baselineWeightKg)} kg`}
                        </Typography>
                        <Typography variant="labelMono" color={Colors.textSecondary} style={styles.caption}>{remainingLabel(progress)}</Typography>
                    </View>
                </View>
            )}
            {goal && !progress && (
                <Typography variant="bodySmall" color={Colors.textSecondary} style={styles.progress}>
                    Progresso indisponível: registre uma medição de peso na data de início da meta ou antes.
                </Typography>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    card: { padding: Spacing.lg, justifyContent: 'space-between', gap: Spacing.md },
    values: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
    goal: { alignItems: 'flex-end' },
    progress: { gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.xs },
    caption: { textTransform: 'none' },
    track: {
        height: 10,
        padding: 2,
        borderRadius: Radius.lg,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: Radius.lg, backgroundColor: Colors.primaryLight },
});
