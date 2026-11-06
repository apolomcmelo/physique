import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
    useWindowDimensions,
    View
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Exercise, Workout } from '../../src/domain/entities/Workout';
import { WorkoutSession } from '../../src/domain/entities/WorkoutSession';
import { completeSet } from '../../src/domain/use-cases/workout/CompleteSet';
import { parseLocalizedDecimal } from '../../src/domain/value-objects/LocalizedDecimal';
import { finishWorkoutSession } from '../../src/domain/use-cases/workout/FinishWorkoutSession';
import { startWorkoutSession } from '../../src/domain/use-cases/workout/StartWorkoutSession';
import { nextRest } from '../../src/domain/use-cases/workout/WorkoutRest';
import { savePartialWorkoutSession } from '../../src/domain/use-cases/workout/SavePartialWorkoutSession';
import { resumedTimedSet } from '../../src/domain/use-cases/workout/WorkoutTimerState';
import { Button } from '../../src/ui/components/Button';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutTimer } from '../../src/ui/components/WorkoutTimer';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { ActiveSetCard } from '../../src/ui/components/workout/ActiveSetCard';
import { RestCard } from '../../src/ui/components/workout/RestCard';
import { SessionHeader } from '../../src/ui/components/workout/SessionHeader';
import { QueueAction, SessionQueue } from '../../src/ui/components/workout/SessionQueue';
import { SessionTopBar } from '../../src/ui/components/workout/SessionTopBar';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';
import { sessionProgress, setTarget } from '../../src/ui/utils/sessionProgress';

const DEFAULT_REST_DURATION = 60;
const REST_DURATION_STEP = 15;
const MIN_REST_DURATION = 0;
const MAX_REST_DURATION = 300;
const WEIGHT_STEP = 1;
const WIDE_BREAKPOINT = 1024;

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { workoutRepo } = useRepositories();
    const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;
    const [keepAwake, setKeepAwake] = useState(true);

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
        if (!session || !keepAwake) return;
        let enabled = false;
        let mounted = true;
        void activateKeepAwakeAsync('active-workout').then(() => {
            enabled = true;
            if (!mounted) deactivateKeepAwake('active-workout');
        }).catch((cause: unknown) => {
            console.warn('[workout] keep-awake activation failed', cause);
        });
        return () => { mounted = false; if (enabled) deactivateKeepAwake('active-workout'); };
    }, [session?.id, keepAwake]);

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
        } catch (cause: unknown) {
            console.error('[workout] initialization failed', { workoutId, error: cause });
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
        const weightUsedKg = actualWeight.trim() ? parseLocalizedDecimal(actualWeight) : null;
        if (actualWeight.trim() && weightUsedKg === null) {
            setError('Informe uma carga válida; use vírgula ou ponto como separador decimal.');
            return;
        }
        if (weightUsedKg !== null && weightUsedKg < 0) {
            setError('A carga não pode ser negativa');
            return;
        }
        savingSetRef.current = true;
        setSetSaving(true);
        const performedDurationSeconds = setDuration === null ? null : setStartedAtRef.current === null ? null
            : Math.min(setDuration, Math.max(0, Math.round((Date.now() - setStartedAtRef.current) / 1000)));
        try {
            const updated = await completeSet(
                workoutRepo,
                session,
                currentExercise,
                currentSetNumber,
                { repsCompleted: setDuration !== null ? 0 : Number(actualReps),
                    weightUsedKg,
                    durationSeconds: performedDurationSeconds },
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
        } catch (cause: unknown) {
            console.error('[workout] set completion failed', {
                workoutId: session.workoutId,
                sessionId: session.id,
                exerciseId: currentExercise.id,
                setNumber: currentSetNumber,
                timedExercise: setDuration !== null,
                prescribedDurationSeconds: setDuration,
                actualDurationSeconds: performedDurationSeconds,
                error: cause,
            });
            const detail = cause instanceof Error ? cause.message : String(cause);
            setError(`Erro ao registrar série: ${detail}`);
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
        } catch (cause: unknown) {
            console.error('[workout] workout finalization failed', {
                workoutId: workout.id,
                sessionId: session.id,
                recordedSetCount: session.sets.length,
                error: cause,
            });
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
        } catch (cause: unknown) {
            console.error('[workout] partial session save failed', {
                workoutId: session.workoutId,
                sessionId: session.id,
                recordedSetCount: session.sets.length,
                error: cause,
            });
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
        } catch (cause: unknown) {
            console.error('[workout] timed set correction failed', {
                workoutId: session.workoutId,
                sessionId: session.id,
                exerciseId: currentExercise.id,
                setNumber: recorded.setNumber,
                correctedDurationSeconds: duration,
                error: cause,
            });
            setError('Erro ao corrigir série');
        }
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
                } catch (cause: unknown) {
                    console.error('[workout] session discard failed', {
                        workoutId: sessionToDiscard.workoutId,
                        sessionId: sessionToDiscard.id,
                        error: cause,
                    });
                    setError('Erro ao descartar treino');
                }
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

    const progress = sessionProgress(workout.exercises, setsRecorded);
    const isPlainTimedSet = !resting && setTimerRunning && setDuration !== null && currentExercise !== null;
    const finalRecordedLabel = isLastExercise && isLastSet;
    const primaryLabel = `Concluir Série ${currentSetNumber} de ${totalSets}${finalRecordedLabel || restDuration === 0 ? '' : ' (Iniciar Descanso)'}`;
    const startTimedSet = () => {
        if (!setDuration) return;
        setStartedAtRef.current = Date.now();
        setSetDeadline(Date.now() + setDuration * 1000);
        setSetTimerRunning(true);
    };

    const setCard = currentExercise && (
        <ActiveSetCard
            setNumber={currentSetNumber}
            totalSets={totalSets}
            target={setTarget(currentExercise)}
            reps={currentExercise.durationSeconds == null
                ? { value: actualReps, onChange: setActualReps, onStep: (direction) => setActualReps((value) => String(Math.max(0, (parseInt(value, 10) || 0) + direction))) }
                : undefined}
            durationLabel={setDuration ? formatDurationLabel(setDuration) : null}
            weight={{
                label: currentExercise.durationSeconds != null && currentExercise.weightKg == null ? 'CARGA (opcional, kg)' : 'Carga Atual',
                value: actualWeight,
                onChange: setActualWeight,
                onStep: (direction) => setActualWeight((value) => stepWeight(value, direction)),
            }}
        >
            {isWorkoutComplete && setDuration !== null && (
                <View>
                    <TextInput accessibilityLabel="Duração realizada em segundos" value={actualDuration} onChangeText={setActualDuration} keyboardType="number-pad" style={styles.correctionInput} />
                    <Button label="Corrigir série" onPress={handleCorrectSet} />
                </View>
            )}

            {isPlainTimedSet && currentExercise && (
                <View style={styles.timedSet}>
                    <TypographyText variant="label" color={Colors.textSecondary}>SÉRIE EM ANDAMENTO</TypographyText>
                    <WorkoutTimer
                        key={`${currentExercise.id}-${setIndex}`}
                        durationSeconds={setDuration ?? 0}
                        deadline={setDeadline ?? undefined}
                        onComplete={handleTimedSetExpired}
                        autoStart
                    >
                        {({ display }) => <Text style={styles.timedDigits}>{display}</Text>}
                    </WorkoutTimer>
                </View>
            )}

            {error && (
                <TypographyText variant="bodySmall" color={Colors.error}>{error}</TypographyText>
            )}

            {!resting && !isWorkoutComplete && !setTimerRunning && setDuration && (
                <TouchableOpacity style={styles.mainBtn} onPress={startTimedSet}>
                    <Ionicons name="play" size={22} color={Colors.onPrimary} />
                    <Text style={styles.mainBtnText}>Iniciar Série</Text>
                </TouchableOpacity>
            )}

            {!resting && !isWorkoutComplete && (setTimerRunning || !setDuration) && (
                <TouchableOpacity style={styles.mainBtn} onPress={handleCompleteSet} disabled={setSaving}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.onPrimary} />
                    <Text style={styles.mainBtnText}>{primaryLabel}</Text>
                </TouchableOpacity>
            )}

            {!resting && isWorkoutComplete && (
                <Button label="Finalizar Treino" onPress={handleFinishWorkout} loading={finishing} style={styles.finishBtn} />
            )}
        </ActiveSetCard>
    );

    const restCard = !isWorkoutComplete && (
        <RestCard
            resting={resting}
            expired={restExpired}
            duration={restDuration}
            deadline={restDeadline}
            canAdjust={!setTimerRunning}
            minDuration={MIN_REST_DURATION}
            maxDuration={MAX_REST_DURATION}
            step={REST_DURATION_STEP}
            onAdjust={adjustRestDuration}
            onExpire={() => setRestExpired(true)}
            onSkip={handleRestComplete}
            onContinue={handleRestComplete}
        />
    );

    const queue = currentExercise && (
        <>
            <SessionQueue
                exercises={workout.exercises}
                currentIndex={exerciseIndex}
                finalSetRecorded={finalSetRecorded}
                currentSet={currentSetNumber}
                totalSets={totalSets}
                currentWeight={actualWeight}
            />
            {session && (!isWorkoutComplete || showExitActions) && (
                <QueueAction label="Salvar parcial" onPress={handleSavePartial} loading={finishing} />
            )}
            {showExitActions && (
                <>
                    <QueueAction label="Retomar" onPress={() => setShowExitActions(false)} />
                    <QueueAction label="Descartar" onPress={handleDiscard} danger />
                </>
            )}
        </>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <SessionTopBar
                workoutName={workout.name}
                startedAt={session?.startedAt ?? new Date()}
                keepAwake={keepAwake}
                onToggleKeepAwake={() => setKeepAwake((enabled) => !enabled)}
                onBack={() => setShowExitActions((shown) => !shown)}
            />
            <ScrollView contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}>
                {currentExercise && (
                    <SessionHeader
                        exerciseName={currentExercise.name}
                        exerciseNumber={exerciseIndex + 1}
                        exerciseCount={workout.exercises.length}
                        percent={progress.percent}
                        currentSet={progress.currentSet}
                        totalSets={progress.totalSets}
                        setsRecorded={setsRecorded}
                    />
                )}
                <View style={[styles.columns, wide && styles.columnsWide]}>
                    <View style={[styles.column, wide && styles.mainColumn]}>
                        {setCard}
                        {restCard}
                    </View>
                    <View style={[styles.column, wide && styles.sideColumn]}>{queue}</View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function formatDurationLabel(seconds: number): string {
    return seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}min` : `${seconds}s`;
}

function stepWeight(value: string, direction: 1 | -1): string {
    const current = value.trim() ? parseLocalizedDecimal(value) ?? 0 : 0;
    const next = Math.max(0, Math.round((current + direction * WEIGHT_STEP) * 10) / 10);
    return String(next).replace('.', ',');
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    scroll: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    scrollWide: { padding: Spacing.xl, width: '100%', maxWidth: 1440, alignSelf: 'center' },
    columns: { gap: Spacing.lg },
    columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
    column: { gap: Spacing.lg },
    mainColumn: { flex: 2 },
    sideColumn: { flex: 1 },
    timedSet: { alignItems: 'center', gap: Spacing.sm },
    timedDigits: { ...Typography.display, color: Colors.primary },
    correctionInput: { color: Colors.textPrimary, fontSize: 20, marginBottom: Spacing.sm },
    mainBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.success,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    mainBtnText: { ...Typography.h2, color: Colors.onPrimary, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
    finishBtn: {
        backgroundColor: Colors.success,
    },
});
