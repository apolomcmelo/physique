import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface SessionHeaderProps {
    exerciseName: string;
    exerciseNumber: number;
    exerciseCount: number;
    percent: number;
    currentSet: number;
    totalSets: number;
    setsRecorded: number;
}

export const SessionHeader = ({
    exerciseName, exerciseNumber, exerciseCount, percent, currentSet, totalSets, setsRecorded,
}: SessionHeaderProps) => (
    <View style={styles.panel}>
        <View style={styles.accent} />
        <View style={styles.row}>
            <View style={styles.titleBlock}>
                <View style={styles.badges}>
                    <View style={styles.badge}><Text style={styles.badgeText}>Treino em Andamento</Text></View>
                    <Text style={styles.meta}>Exercício {exerciseNumber} de {exerciseCount}</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>{exerciseName}</Text>
            </View>
            <View style={styles.progress}>
                <View style={styles.progressLabels}>
                    <Text style={styles.metaStrong}>Progresso: {percent}%</Text>
                    <Text style={styles.setOf}>Série {currentSet} de {totalSets}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>
                <Text style={styles.meta}>{setsRecorded} séries registradas</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    panel: {
        padding: Spacing.md,
        paddingLeft: Spacing.md + 6,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceContainer,
        overflow: 'hidden',
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: Colors.primary },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    titleBlock: { flex: 1, minWidth: 220 },
    badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xs },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm, backgroundColor: 'rgba(0, 230, 118, 0.15)' },
    badgeText: { ...Typography.labelMono, color: Colors.primary },
    meta: { ...Typography.labelMono, color: Colors.textDisabled, textTransform: 'none' },
    metaStrong: { ...Typography.labelMono, color: Colors.textSecondary, textTransform: 'none' },
    title: { ...Typography.h2, color: Colors.textPrimary },
    progress: { minWidth: 200, gap: 6 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    setOf: { ...Typography.labelMono, color: Colors.primary, textTransform: 'none', fontWeight: '700' },
    track: { height: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceHighest, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: Radius.full, backgroundColor: Colors.primary },
});
