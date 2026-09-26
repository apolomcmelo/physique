import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Exercise, Workout } from '../../src/domain/entities/Workout';
import { WorkoutSession } from '../../src/domain/entities/WorkoutSession';
import { completeSet } from '../../src/domain/use-cases/workout/CompleteSet';
import { finishWorkoutSession } from '../../src/domain/use-cases/workout/FinishWorkoutSession';
import { startWorkoutSession } from '../../src/domain/use-cases/workout/StartWorkoutSession';
import { nextRest } from '../../src/domain/use-cases/workout/WorkoutRest';
import { savePartialWorkoutSession } from '../../src/domain/use-cases/workout/SavePartialWorkoutSession';
import { resumedTimedSet } from '../../src/domain/use-cases/workout/WorkoutTimerState';
import { Button } from '../../src/ui/components/Button';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutTimer } from '../../src/ui/components/WorkoutTimer';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

const DEFAULT_REST_DURATION = 60;
const REST_DURATION_STEP = 15;
const MIN_REST_DURATION = 0;
const MAX_REST_DURATION = 300;

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { workoutRepo } = useRepositories();

    const [workout, setWorkout] = useState<Workout | null>(null);
    const [session, setSession] = useState<WorkoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [finishing, setFinishing] = useState(false);
    const savingSetRef = useRef(false);
    const finishingRef = useRef(false);

    // Progress tracking
    const [exerciseIndex, setExerciseIndex] = useState(0);
    const [setIndex, setSetIndex] = useState(0); // 0-based current set
    const [finalSetRecorded, setFinalSetRecorded] = useState(false);
    const [setsRecorded, setSetsRecorded] = useState(0);
    const [actualReps, setActualReps] = useState('');
    const [actualWeight, setActualWeight] = useState('');
    const [actualDuration, setActualDuration] = useState('');

    // Rest timer
    const [resting, setResting] = useState(false);
    const [restDuration, setRestDuration] = useState(DEFAULT_REST_DURATION);

    // Working-set timer (time-based exercises)
    const [setTimerRunning, setSetTimerRunning] = useState(false);
    const [setSaving, setSetSaving] = useState(false);
    const setStartedAtRef = useRef<number | null>(null);
    const [setDeadline, setSetDeadline] = useState<number | null>(null);
    const [restDeadline, setRestDeadline] = useState<number | null>(null);
    const [restExpired, setRestExpired] = useState(false);
    const restStartRef = useRef<number | null>(null);
    const [showExitActions, setShowExitActions] = useState(false);
    const [resumableSession, setResumableSession] = useState<WorkoutSession | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Treino não encontrado');
            setLoading(false);
            return;
        }
        initWorkout(id);
    }, [id]);

    useEffect(() => {
        if (!session) return;
        let enabled = false;
        let mounted = true;
        void activateKeepAwakeAsync('active-workout').then(() => {
            enabled = true;
            if (!mounted) deactivateKeepAwake('active-workout');
        }).catch(() => {});
        return () => { mounted = false; if (enabled) deactivateKeepAwake('active-workout'); };
    }, [session?.id]);

    async function initWorkout(workoutId: string) {
        try {
            setLoading(true);
            const w = await workoutRepo.getWorkoutById(workoutId);
            if (!w) {
                setError('Treino não encontrado');
                return;
            }
            setWorkout(w);
            const existing = (await workoutRepo.getWorkoutSessions(workoutId)).find((candidate) => !candidate.finishedAt);
            if (existing) { setResumableSession(existing); return; }
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
    const setDuration = currentExercise?.durationSeconds ?? null;

    const isLastSet = setIndex >= totalSets - 1;
    const isLastExercise = workout ? exerciseIndex >= workout.exercises.length - 1 : false;
    const isWorkoutComplete = isLastExercise && isLastSet && finalSetRecorded;
    const previousSet = session?.sets.find((set) => set.exerciseId === currentExercise?.id && set.setNumber === currentSetNumber - 1);

    function resumeSession(existing: WorkoutSession) {
        if (!workout) return;
        const nextExerciseIndex = workout.exercises.findIndex((exercise) =>
            existing.sets.filter((set) => set.exerciseId === exercise.id).length < (exercise.sets ?? 1));
        if (nextExerciseIndex === -1) {
            setExerciseIndex(workout.exercises.length - 1);
            setSetIndex((workout.exercises[workout.exercises.length - 1].sets ?? 1) - 1);
            setFinalSetRecorded(true);
        } else {
            setExerciseIndex(nextExerciseIndex);
            setSetIndex(existing.sets.filter((set) => set.exerciseId === workout.exercises[nextExerciseIndex].id).length);
        }
        setSession(existing);
        setSetsRecorded(existing.sets.length);
        setResumableSession(null);
    }

    useEffect(() => {
        setActualReps(String(previousSet?.repsCompleted ?? currentExercise?.repsPerSet ?? 0));
        setActualWeight(previousSet?.weightUsedKg != null ? String(previousSet.weightUsedKg) : currentExercise?.weightKg == null ? '' : String(currentExercise.weightKg));
        if (currentExercise) setRestDuration(nextRest(currentExercise, setIndex + 1, isLastExercise) ?? 0);
    }, [currentExercise?.id, setIndex]);

    function adjustRestDuration(change: number) {
        const duration = Math.min(MAX_REST_DURATION, Math.max(MIN_REST_DURATION, restDuration + change));
        setRestDuration(duration);
        if (resting) {
            setRestDeadline(Date.now() + duration * 1000);
            setRestExpired(duration === 0);
        }
    }

    async function handleCompleteSet() {
        if (!session || !currentExercise || savingSetRef.current || finishingRef.current || finalSetRecorded) return;
        savingSetRef.current = true;
        setSetSaving(true);
        try {
            const updated = await completeSet(
                workoutRepo,
                session,
                currentExercise,
                currentSetNumber,
                { repsCompleted: Number(actualReps), weightUsedKg: actualWeight.trim() ? Number(actualWeight.replace(',', '.')) : null,
                    durationSeconds: setDuration === null ? null : setStartedAtRef.current === null ? null
                        : Math.min(setDuration, Math.max(0, Math.round((Date.now() - setStartedAtRef.current) / 1000))) },
            );
            setSession(updated);
            setError(null);
            setSetsRecorded(updated.sets.length);
            setActualDuration(String(updated.sets[updated.sets.length - 1].durationSeconds ?? 0));
            setSetTimerRunning(false);
            if (isLastExercise && isLastSet) setFinalSetRecorded(true);
            else if (restDuration === 0) handleRestComplete();
            else {
                const completedAt = updated.sets[updated.sets.length - 1].completedAt.getTime();
                const restStartsAt = setDuration !== null && setStartedAtRef.current !== null
                    ? Math.min(completedAt, setStartedAtRef.current + setDuration * 1000)
                    : completedAt;
                restStartRef.current = restStartsAt;
                setRestDeadline(setDuration !== null && setStartedAtRef.current !== null && completedAt >= setStartedAtRef.current + setDuration * 1000
                    ? resumedTimedSet(setStartedAtRef.current, setDuration, restDuration, Date.now()).restDeadline
                    : restStartsAt + restDuration * 1000);
                setResting(true);
                setRestExpired(restStartsAt + restDuration * 1000 <= Date.now());
            }
            setStartedAtRef.current = null;
        } catch {
            setError('Erro ao registrar série');
        } finally {
            savingSetRef.current = false;
            setSetSaving(false);
        }
    }

    async function handleTimedSetExpired() {
        await handleCompleteSet();
    }

    function handleRestComplete() {
        setRestExpired(true);
        setResting(false);
        setRestDeadline(null);
        restStartRef.current = null;
        setError(null);
        if (isLastSet) {
            if (!isLastExercise) {
                setExerciseIndex((prev) => prev + 1);
                setSetIndex(0);
            }
            // If last exercise + last set, the button to finish appears
        } else {
            setSetIndex((prev) => prev + 1);
        }
        setSetTimerRunning(false);
    }

    async function handleFinishWorkout() {
        if (!session || !workout || finishingRef.current || savingSetRef.current || !isWorkoutComplete) return;
        finishingRef.current = true;
        try {
            setFinishing(true);
            await finishWorkoutSession(workoutRepo, session, workout);
            router.replace('/(tabs)/workout');
        } catch {
            setError('Erro ao finalizar treino');
        } finally {
            finishingRef.current = false;
            setFinishing(false);
        }
    }

    async function handleSavePartial() {
        if (!session || savingSetRef.current || finishingRef.current) return;
        finishingRef.current = true;
        try {
            setFinishing(true);
            await savePartialWorkoutSession(workoutRepo, session);
            router.replace('/(tabs)/workout');
        } catch {
            setError('Erro ao salvar sessão parcial');
        } finally {
            finishingRef.current = false;
            setFinishing(false);
        }
    }

    async function handleCorrectSet() {
        if (!session || !currentExercise || savingSetRef.current) return;
        const recorded = session.sets.find((set) => set.exerciseId === currentExercise.id && set.setNumber === currentSetNumber);
        if (!recorded) return;
        const duration = Number(actualDuration);
        if (!Number.isInteger(duration) || duration < 0) { setError('Duração inválida'); return; }
        savingSetRef.current = true;
        try {
            const corrected = { ...session, sets: session.sets.map((set) => set.id === recorded.id ? { ...set, durationSeconds: duration } : set) };
            await workoutRepo.saveWorkoutSession(corrected);
            setSession(corrected);
            setError(null);
        } catch { setError('Erro ao corrigir série'); }
        finally { savingSetRef.current = false; }
    }

    function handleDiscard() {
        if (!session || savingSetRef.current || finishingRef.current) return;
        const sessionToDiscard = session;
        Alert.alert('Descartar treino?', 'As séries registradas nesta sessão serão apagadas.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: async () => {
                try {
                    await workoutRepo.deleteWorkoutSession(sessionToDiscard.id);
                    router.replace('/(tabs)/workout');
                } catch { setError('Erro ao descartar treino'); }
            } },
        ]);
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    if (!workout) {
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

    if (resumableSession) {
        return <SafeAreaView style={styles.safe}><View style={styles.centered}>
            <TypographyText variant="h3" color={Colors.textPrimary}>Sessão em andamento</TypographyText>
            <Button label="Retomar treino" onPress={() => resumeSession(resumableSession)} />
        </View></SafeAreaView>;
    }

    return (
        <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setShowExitActions((shown) => !shown)} style={styles.backBtn}>
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
            <TypographyText variant="bodySmall" color={Colors.textSecondary} style={{ textAlign: 'center' }}>
                {setsRecorded} séries registradas
            </TypographyText>

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
                        <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                            Próximo: {workout.exercises[exerciseIndex + 1]?.name ?? 'Finalização'}
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
                            {currentExercise.durationSeconds == null && (
                                <View style={styles.statBox}>
                                    <TypographyText variant="label" color={Colors.textDisabled}>
                                        REPS (previsto: {currentExercise.repsPerSet ?? 0})
                                    </TypographyText>
                                    <TextInput accessibilityLabel="Repetições realizadas" value={actualReps} onChangeText={setActualReps} keyboardType="number-pad" style={{ color: Colors.textPrimary, fontSize: 22 }} />
                                </View>
                            )}
                            {setDuration && (
                                <View style={styles.statBox}>
                                    <TypographyText variant="label" color={Colors.textDisabled}>
                                        DURAÇÃO
                                    </TypographyText>
                                    <TypographyText variant="h2" color={Colors.textPrimary}>
                                        {setDuration >= 60
                                            ? `${Math.floor(setDuration / 60)}:${String(setDuration % 60).padStart(2, '0')}min`
                                            : `${setDuration}s`}
                                    </TypographyText>
                                </View>
                            )}
                            {currentExercise.durationSeconds == null && (
                                <View style={styles.statBox}>
                                    <TypographyText variant="label" color={Colors.textDisabled}>
                                        PESO (previsto: {currentExercise.weightKg ?? 0} kg)
                                    </TypographyText>
                                    <TextInput accessibilityLabel="Carga realizada em kg" value={actualWeight} onChangeText={setActualWeight} keyboardType="decimal-pad" style={{ color: Colors.textPrimary, fontSize: 22 }} />
                                </View>
                            )}
                        </View>

                        {isWorkoutComplete && setDuration !== null && (
                            <View>
                                <TextInput accessibilityLabel="Duração realizada em segundos" value={actualDuration} onChangeText={setActualDuration} keyboardType="number-pad" style={{ color: Colors.textPrimary, fontSize: 20 }} />
                                <Button label="Corrigir série" onPress={handleCorrectSet} />
                            </View>
                        )}

                        {!setTimerRunning && !isWorkoutComplete && (
                            <View style={styles.restControls}>
                                <TouchableOpacity
                                    accessibilityLabel="Diminuir descanso em 15 segundos"
                                    disabled={restDuration <= MIN_REST_DURATION}
                                    onPress={() => adjustRestDuration(-REST_DURATION_STEP)}
                                    style={[
                                        styles.restAdjustBtn,
                                        restDuration <= MIN_REST_DURATION && styles.restAdjustBtnDisabled,
                                    ]}
                                >
                                    <Text style={[Typography.h3, { color: Colors.textPrimary }]}>-</Text>
                                </TouchableOpacity>
                                <TypographyText variant="body" color={Colors.textSecondary} style={styles.restDurationText}>
                                    Descanso {restDuration}s
                                </TypographyText>
                                <TouchableOpacity
                                    accessibilityLabel="Aumentar descanso em 15 segundos"
                                    disabled={restDuration >= MAX_REST_DURATION}
                                    onPress={() => adjustRestDuration(REST_DURATION_STEP)}
                                    style={[
                                        styles.restAdjustBtn,
                                        restDuration >= MAX_REST_DURATION && styles.restAdjustBtnDisabled,
                                    ]}
                                >
                                    <Text style={[Typography.h3, { color: Colors.textPrimary }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {/* Working-set timer (time-based exercises) */}
                {!resting && setTimerRunning && setDuration && currentExercise && (
                    <View style={styles.timerContainer}>
                        <TypographyText variant="label" color={Colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                            SÉRIE EM ANDAMENTO
                        </TypographyText>
                        <WorkoutTimer
                            key={`${currentExercise.id}-${setIndex}`}
                            durationSeconds={setDuration}
                            deadline={setDeadline ?? undefined}
                            onComplete={handleTimedSetExpired}
                            autoStart
                        />
                    </View>
                )}

                {/* Rest Timer */}
                {resting && (
                    <View style={styles.timerContainer}>
                        <TypographyText variant="label" color={Colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                            DESCANSO
                        </TypographyText>
                        {!restExpired && <WorkoutTimer
                            durationSeconds={restDuration}
                            deadline={restDeadline ?? undefined}
                            onComplete={() => setRestExpired(true)}
                            autoStart
                        />}
                        {restExpired ? <Button label="Continuar após descanso" onPress={handleRestComplete} />
                            : <TouchableOpacity onPress={handleRestComplete} accessibilityLabel="Pular descanso" style={styles.skipBtn}>
                                <Text style={[Typography.label, { color: Colors.textSecondary }]}>PULAR DESCANSO</Text>
                            </TouchableOpacity>}
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.footer}>
                {showExitActions && (
                    <View>
                        <Button label="Retomar" onPress={() => setShowExitActions(false)} />
                        <Button label="Salvar parcial" onPress={handleSavePartial} loading={finishing} />
                        <Button label="Descartar" onPress={handleDiscard} />
                    </View>
                )}
                {!showExitActions && session && !isWorkoutComplete && (
                    <Button label="Salvar parcial" onPress={handleSavePartial} loading={finishing} />
                )}
                {error && (
                    <TypographyText variant="bodySmall" color={Colors.error} style={{ marginBottom: Spacing.sm }}>
                        {error}
                    </TypographyText>
                )}

                {!resting && !isWorkoutComplete && !setTimerRunning && setDuration && (
                    <TouchableOpacity style={styles.mainBtn} onPress={() => { setStartedAtRef.current = Date.now(); setSetDeadline(Date.now() + setDuration * 1000); setSetTimerRunning(true); }}>
                        <Text style={[Typography.h3, { color: Colors.white }]}>▶ Iniciar Série</Text>
                    </TouchableOpacity>
                )}

                {!resting && !isWorkoutComplete && (setTimerRunning || !setDuration) && (
                    <TouchableOpacity style={styles.mainBtn} onPress={handleCompleteSet} disabled={setSaving}>
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
        paddingVertical: Spacing.sm,
    },
    exerciseName: {
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
        maxWidth: '100%',
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
        width: '100%',
        maxWidth: 280,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        minWidth: 90,
        flexBasis: '30%',
        flexGrow: 1,
    },
    timerContainer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    restControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    restAdjustBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restAdjustBtnDisabled: {
        opacity: 0.4,
    },
    restDurationText: {
        minWidth: 72,
        textAlign: 'center',
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
