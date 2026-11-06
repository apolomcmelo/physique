import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { formatClock } from '../../utils/sessionProgress';
import { WorkoutTimer } from '../WorkoutTimer';

interface RestCardProps {
    resting: boolean;
    expired: boolean;
    duration: number;
    deadline: number | null;
    canAdjust: boolean;
    minDuration: number;
    maxDuration: number;
    step: number;
    onAdjust: (delta: number) => void;
    onExpire: () => void;
    onSkip: () => void;
    onContinue: () => void;
}

export const RestCard = ({
    resting, expired, duration, deadline, canAdjust, minDuration, maxDuration, step, onAdjust, onExpire, onSkip, onContinue,
}: RestCardProps) => (
    <View style={styles.card}>
        <View style={styles.head}>
            <View style={styles.title}>
                <Ionicons name="hourglass-outline" size={20} color={Colors.tertiary} />
                <Text style={styles.titleText}>Descanso</Text>
            </View>
            {canAdjust ? (
                <View style={styles.adjust}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Diminuir descanso em ${step} segundos`}
                        disabled={duration <= minDuration}
                        onPress={() => onAdjust(-step)}
                        style={[styles.adjustBtn, duration <= minDuration && styles.disabled]}
                    >
                        <Text style={styles.adjustText}>-</Text>
                    </Pressable>
                    <Text style={styles.duration}>Descanso {duration}s</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Aumentar descanso em ${step} segundos`}
                        disabled={duration >= maxDuration}
                        onPress={() => onAdjust(step)}
                        style={[styles.adjustBtn, duration >= maxDuration && styles.disabled]}
                    >
                        <Text style={styles.adjustText}>+</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
        {resting && !expired ? (
            <WorkoutTimer durationSeconds={duration} deadline={deadline ?? undefined} onComplete={onExpire} autoStart>
                {({ remaining, display }) => (
                    <>
                        <View style={styles.countdownRow}>
                            <Text style={[styles.countdown, remaining <= 5 && { color: Colors.error }]}>{display}</Text>
                            <Text style={styles.caption}>restantes</Text>
                        </View>
                        <View style={styles.track}>
                            <View style={[styles.fill, { width: `${duration > 0 ? Math.min(100, (remaining / duration) * 100) : 0}%` }]} />
                        </View>
                    </>
                )}
            </WorkoutTimer>
        ) : (
            <View style={styles.countdownRow}>
                <Text style={[styles.countdown, styles.idle]}>{formatClock(expired ? 0 : duration)}</Text>
                <Text style={styles.caption}>{expired ? 'descanso concluído' : 'ao concluir a série'}</Text>
            </View>
        )}
        {resting ? (
            expired ? (
                <Pressable accessibilityRole="button" onPress={onContinue} style={styles.continueBtn}>
                    <Text style={styles.continueText}>Continuar após descanso</Text>
                </Pressable>
            ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Pular descanso" onPress={onSkip} style={styles.skipBtn}>
                    <Ionicons name="play-skip-forward" size={16} color={Colors.tertiary} />
                    <Text style={styles.skipText}>Pular Descanso</Text>
                </Pressable>
            )
        ) : null}
    </View>
);

const styles = StyleSheet.create({
    card: {
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 187, 101, 0.4)',
        backgroundColor: Colors.surfaceContainer,
        gap: Spacing.md,
    },
    head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    title: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    titleText: { ...Typography.h3, color: Colors.textPrimary },
    adjust: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    adjustBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceHighest,
    },
    adjustText: { ...Typography.metricMd, color: Colors.textPrimary },
    disabled: { opacity: 0.4 },
    duration: { ...Typography.labelMono, color: Colors.textSecondary, textTransform: 'none', minWidth: 90, textAlign: 'center' },
    countdownRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
    countdown: { ...Typography.display, color: Colors.tertiary },
    idle: { opacity: 0.45 },
    caption: { ...Typography.labelMono, color: Colors.textSecondary },
    track: {
        height: 10,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceHighest,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: Radius.full, backgroundColor: Colors.tertiary },
    skipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 187, 101, 0.3)',
        backgroundColor: Colors.surfaceHighest,
    },
    skipText: { ...Typography.metricSm, color: Colors.tertiary, fontWeight: '700' },
    continueBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.primary },
    continueText: { ...Typography.h4, color: Colors.onPrimary },
});
