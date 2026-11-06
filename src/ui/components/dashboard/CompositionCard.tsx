import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WeightRecord } from '../../../domain/entities/WeightRecord';
import { Colors, Radius, Spacing } from '../../theme';
import { Card } from '../Card';
import { Typography } from '../Typography';
import { ActionLink } from './ActionLink';
import { DashboardCardHeader } from './DashboardCardHeader';
import { formatDate, formatDecimal } from './format';

interface CompositionCardProps {
    bodyFat: WeightRecord | null;
    protein: WeightRecord | null;
    onOpenHistory: () => void;
    style?: ViewStyle;
}

const CompositionTile = ({ label, value, measuredAt, accent }: {
    label: string;
    value: number | null;
    measuredAt: Date | null;
    accent: string;
}) => (
    <View style={styles.tile}>
        <Typography variant="labelMono" color={Colors.outline} style={styles.caption}>{label}</Typography>
        <Typography variant="metricLg" color={accent}>{value !== null ? `${formatDecimal(value)}%` : '—'}</Typography>
        <Typography variant="labelMono" color={Colors.outline} style={styles.caption}>
            {measuredAt ? `Medido em ${formatDate(measuredAt)}` : 'Sem medição'}
        </Typography>
    </View>
);

export const CompositionCard = ({ bodyFat, protein, onOpenHistory, style }: CompositionCardProps) => (
    <Card style={{ ...styles.card, ...style }}>
        <DashboardCardHeader icon="pie-chart" accent={Colors.secondary} title="Composição Corporal" subtitle="Leituras mais recentes" />
        <View style={styles.tiles}>
            <CompositionTile
                label="Gordura corporal"
                value={bodyFat?.bodyFatPercentage ?? null}
                measuredAt={bodyFat?.recordedAt ?? null}
                accent={Colors.textPrimary}
            />
            <CompositionTile
                label="Proteína"
                value={protein?.proteinPercentage ?? null}
                measuredAt={protein?.recordedAt ?? null}
                accent={Colors.secondary}
            />
        </View>
        <View style={styles.footer}>
            <ActionLink label="Histórico completo" accent={Colors.primary} onPress={onOpenHistory} />
        </View>
    </Card>
);

const styles = StyleSheet.create({
    card: { padding: Spacing.lg, justifyContent: 'space-between', gap: Spacing.md },
    tiles: { flexDirection: 'row', gap: Spacing.md },
    tile: {
        flex: 1,
        gap: Spacing.xs,
        padding: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceContainer,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    caption: { textTransform: 'none' },
    footer: { paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderSubtle, alignItems: 'flex-end' },
});
