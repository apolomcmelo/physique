import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, Workout } from '../../src/domain/entities/Workout';
import { WorkoutSession } from '../../src/domain/entities/WorkoutSession';
import { completeSet } from '../../src/domain/use-cases/workout/CompleteSet';
import { finishWorkoutSession } from '../../src/domain/use-cases/workout/FinishWorkoutSession';
import { startWorkoutSession } from '../../src/domain/use-cases/workout/StartWorkoutSession';
import { Button } from '../../src/ui/components/Button';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutTimer } from '../../src/ui/components/WorkoutTimer';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

const REST_DURATION = 90;

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { workoutRepo } = useRepositories();

    const [workout, setWorkout] = useState<Workout | null>(null);
    const [session, setSession] = useState<WorkoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [finishing, setFinishing] = useState(false);

    // Progress tracking
    const [exerciseIndex, setExerciseIndex] = useState(0);
    const [setIndex, setSetIndex] = useState(0); // 0-based current set

    // Rest timer
    const [resting, setResting] = useState(false);

    useEffect(() => {
        if (!id) {
            setError('Treino não encontrado');
            setLoading(false);
            return;
        }
        initWorkout(id);
    }, [id]);

    async function initWorkout(workoutId: string) {
        try {
            setLoading(true);
            const w = await workoutRepo.getWorkoutById(workoutId);
            if (!w) {
                setError('Treino não encontrado');
                return;
            }
            setWorkout(w);
            const s = await startWorkoutSession(workoutRepo, workoutId);
            setSession(s);
        } catch {
            setError('Erro ao iniciar treino');
        } finally {
            setLoading(false);
        }
    }

    const currentExercise: Exercise | null = workout?.exercises[exerciseIndex] ?? null;
    const totalSets = currentExercise?.sets ?? 1;
    const currentSetNumber = setIndex + 1; // 1-based display

    const isLastSet = setIndex >= totalSets - 1;
    const isLastExercise = workout ? exerciseIndex >= workout.exercises.length - 1 : false;
    const isWorkoutComplete = isLastExercise && isLastSet;

    async function handleCompleteSet() {
        if (!session || !currentExercise) return;
        try {
            const updated = await completeSet(
                workoutRepo,
                session,
                currentExercise.id,
                currentExercise.repsPerSet ?? 0,
                currentExercise.weightKg,
            );
            setSession(updated);
            setResting(true);
        } catch {
            setError('Erro ao registrar série');
        }
    }

    function handleRestComplete() {
        setResting(false);
        if (isLastSet) {
            if (!isLastExercise) {
                setExerciseIndex((prev) => prev + 1);
                setSetIndex(0);
            }
            // If last exercise + last set, the button to finish appears
        } else {
            setSetIndex((prev) => prev + 1);
        }
    }

    async function handleFinishWorkout() {
        if (!session) return;
        try {
            setFinishing(true);
            await finishWorkoutSession(workoutRepo, session);
            router.replace('/(tabs)/workout');
        } catch {
            setError('Erro ao finalizar treino');
        } finally {
            setFinishing(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (error || !workout) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <TypographyText variant="h3" color={Colors.error}>
                        {error ?? 'Treino não encontrado'}
                    </TypographyText>
                    <Button label="Voltar" onPress={() => router.back()} style={{ marginTop: Spacing.lg }} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={[Typography.h4, { color: Colors.textSecondary }]}>← Voltar</Text>
                </TouchableOpacity>
                <TypographyText variant="h3" color={Colors.textPrimary}>
                    {workout.name}
                </TypographyText>
                <View style={{ width: 60 }} />
            </View>

            {/* Exercise Progress */}
            <View style={styles.progressBar}>
                {workout.exercises.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i === exerciseIndex && styles.progressDotActive,
                            i < exerciseIndex && styles.progressDotDone,
                        ]}
                    />
                ))}
            </View>

            {/* Main Content */}
            <View style={styles.body}>
                {currentExercise && (
                    <>
                        <TypographyText variant="label" color={Colors.textSecondary}>
                            EXERCÍCIO {exerciseIndex + 1} / {workout.exercises.length}
                        </TypographyText>
                        <TypographyText variant="h1" color={Colors.textPrimary} style={styles.exerciseName}>
                            {currentExercise.name}
                        </TypographyText>

                        <View style={styles.setInfo}>
                            <View style={styles.setChip}>
                                <TypographyText variant="h2" color={Colors.primary}>
                                    Série {currentSetNumber}
                                </TypographyText>
                                <TypographyText variant="body" color={Colors.textSecondary}>
                                    de {totalSets}
                                </TypographyText>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            {currentExercise.repsPerSet && (
                                <View style={styles.statBox}>
                                    <TypographyText variant="label" color={Colors.textDisabled}>
                                        REPS
                                    </TypographyText>
                                    <TypographyText variant="h2" color={Colors.textPrimary}>
                                        {currentExercise.repsPerSet}
                                    </TypographyText>
                                </View>
                            )}
                            {currentExercise.weightKg && (
                                <View style={styles.statBox}>
                                    <TypographyText variant="label" color={Colors.textDisabled}>
                                        PESO
                                    </TypographyText>
                                    <TypographyText variant="h2" color={Colors.textPrimary}>
                                        {currentExercise.weightKg} kg
                                    </TypographyText>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* Rest Timer */}
                {resting && (
                    <View style={styles.timerContainer}>
                        <TypographyText variant="label" color={Colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                            DESCANSO
                        </TypographyText>
                        <WorkoutTimer
                            durationSeconds={REST_DURATION}
                            onComplete={handleRestComplete}
                            autoStart
                        />
                        <TouchableOpacity onPress={handleRestComplete} style={styles.skipBtn}>
                            <Text style={[Typography.label, { color: Colors.textSecondary }]}>PULAR DESCANSO</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
                {error && (
                    <TypographyText variant="bodySmall" color={Colors.error} style={{ marginBottom: Spacing.sm }}>
                        {error}
                    </TypographyText>
                )}

                {!resting && !isWorkoutComplete && (
                    <TouchableOpacity style={styles.mainBtn} onPress={handleCompleteSet}>
                        <Text style={[Typography.h3, { color: Colors.white }]}>✓ Terminei a Série</Text>
                    </TouchableOpacity>
                )}

                {!resting && isWorkoutComplete && (
                    <Button
                        label="Finalizar Treino 🏁"
                        onPress={handleFinishWorkout}
                        loading={finishing}
                        style={styles.finishBtn}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    backBtn: { width: 60 },
    progressBar: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    progressDot: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
    },
    progressDotActive: { backgroundColor: Colors.primary },
    progressDotDone: { backgroundColor: Colors.primaryLight },
    body: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseName: {
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    setInfo: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    setChip: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginTop: Spacing.md,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        minWidth: 100,
    },
    timerContainer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    skipBtn: {
        marginTop: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    footer: {
        padding: Spacing.md,
        paddingBottom: Spacing.lg,
    },
    mainBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    finishBtn: {
        backgroundColor: Colors.success,
    },
});
