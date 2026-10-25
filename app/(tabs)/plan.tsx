import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { useAuth } from '../../src/ui/hooks/useAuth';
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { Colors, Spacing } from '../../src/ui/theme';
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { MealConsumption, MealConsumptionStatus, createMealConsumption } from '../../src/domain/entities/MealConsumption';
import { Workout, WorkoutType } from '../../src/domain/entities/Workout';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { Button } from '../../src/ui/components/Button';
import { router } from 'expo-router';
import { readRoutineCsv } from '../../src/domain/use-cases/routine/ReadRoutineCsv';
import { validateRoutineCsv, RoutinePreview } from '../../src/domain/use-cases/routine/ValidateRoutineCsv';
import { proposeRoutine, RoutineProposal, RoutineState, visibleRoutine } from '../../src/domain/use-cases/routine/RoutineVersions';
import { LocalRoutineRepository } from '../../src/adapters/local/LocalRoutineRepository';
import { SupabaseRoutineRepository } from '../../src/adapters/supabase/SupabaseRoutineRepository';
import { Input } from '../../src/ui/components/Input';
import { formatMealDateInput, formatMealTimeInput, parseMealDateTime } from '../../src/domain/use-cases/meal/MealConsumptionInput';

interface TimelineItem {
    id: string;
    day: string;
    time: string;
    activity: string;
    description: string;
    objective: string | null;
    kind: 'meal' | 'workout';
}

const WEEKDAY_LABELS = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
];

const DAY_ORDER: Record<string, number> = {
    'segunda-feira': 0,
    'terça-feira': 1,
    'terca-feira': 1,
    'quarta-feira': 2,
    'quinta-feira': 3,
    'sexta-feira': 4,
    'sábado': 5,
    'sabado': 5,
    'domingo': 6,
};

const FILTER_OPTIONS: { key: string; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: '0', label: 'Segunda' },
    { key: '1', label: 'Terça' },
    { key: '2', label: 'Quarta' },
    { key: '3', label: 'Quinta' },
    { key: '4', label: 'Sexta' },
    { key: '5', label: 'Sábado' },
    { key: '6', label: 'Domingo' },
    { key: 'all', label: 'Todos' },
];

/** Converts JS Date.getDay() (0=Sunday) to our Monday-first day order (0=Monday). */
function todayDayOrder(): number {
    return (new Date().getDay() + 6) % 7;
}

const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
    Calisthenics: 'Calistenia',
    Weightlifting: 'Musculação',
    HIT: 'HIT',
};

function workoutToTimelineItem(workout: Workout): TimelineItem {
    const at = workout.scheduledAt;
    return {
        id: workout.id,
        day: at ? WEEKDAY_LABELS[at.getDay()] : '',
        time: at ? at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        activity: WORKOUT_TYPE_LABEL[workout.type],
        description: workout.name,
        objective: null,
        kind: 'workout',
    };
}

function buildTimeline(entries: MealPlanEntry[], workouts: Workout[]): TimelineItem[] {
    const items: TimelineItem[] = [
        ...entries.map((e) => ({
            id: e.id,
            day: e.day,
            time: e.time,
            activity: e.activity,
            description: e.description,
            objective: e.biologicalObjective,
            kind: 'meal' as const,
        })),
        ...workouts.map(workoutToTimelineItem),
    ];

    return items.sort((a, b) => {
        const dayA = DAY_ORDER[a.day.trim().toLowerCase()] ?? 99;
        const dayB = DAY_ORDER[b.day.trim().toLowerCase()] ?? 99;
        if (dayA !== dayB) return dayA - dayB;
        return a.time.localeCompare(b.time);
    });
}

function isSameLocalDay(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

export default function PlanScreen() {
    const { mealRepo, mealConsumptionRepo, workoutRepo, userRepo } = useRepositories();
    const { session } = useAuth();
    const [entries, setEntries] = useState<MealPlanEntry[]>([]);
    const [consumptions, setConsumptions] = useState<MealConsumption[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dayFilter, setDayFilter] = useState('today');
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [preview, setPreview] = useState<{ content: string; plan: RoutinePreview; proposal: RoutineProposal; timezone: string } | null>(null);
    const [routineState, setRoutineState] = useState<RoutineState>({ active: null, pending: null });
    const [viewedVersion, setViewedVersion] = useState<'active' | 'pending'>('active');
    const [editingVersion, setEditingVersion] = useState(false);
    const [timezoneWarning, setTimezoneWarning] = useState<string | null>(null);
    const [mealForm, setMealForm] = useState<{
        plannedMealId: string | null; activity: string; description: string; notes: string;
        date: string; time: string; status: MealConsumptionStatus;
    } | null>(null);
    const [savingMeal, setSavingMeal] = useState(false);
    const consumptionsRef = useRef<MealConsumption[]>([]);
    const pendingMealKeys = useRef(new Set<string>());
    const routineRepo = process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true' ? new LocalRoutineRepository() : new SupabaseRoutineRepository();

    useEffect(() => {
        loadEntries();
    }, []);

    async function loadEntries() {
        try {
            setLoading(true);
            const [mealEntries, workoutList, mealLogs] = await Promise.all([
                mealRepo.getMealPlanEntries(),
                workoutRepo.getWorkouts(),
                mealConsumptionRepo.getMealConsumptions(),
            ]);
            setEntries(mealEntries);
            setWorkouts(workoutList);
            setConsumptions(mealLogs);
            consumptionsRef.current = mealLogs;
            const state = visibleRoutine(await routineRepo.getState(), new Date());
            setRoutineState(state);
            if (!state.active && state.pending) setViewedVersion('pending');
            setError(null);
        } catch {
            setError('Erro ao carregar plano');
        } finally {
            setLoading(false);
        }
    }

    function openMealForm(item?: TimelineItem, status: MealConsumptionStatus = 'consumed') {
        const now = new Date();
        setMealForm({
            plannedMealId: item?.kind === 'meal' ? item.id : null,
            activity: item?.kind === 'meal' ? item.activity : '',
            description: item?.kind === 'meal' ? item.description : '',
            notes: '',
            date: formatMealDateInput(now),
            time: formatMealTimeInput(now),
            status,
        });
    }

    function saveConsumptionState(record: MealConsumption) {
        const updated = [
            ...consumptionsRef.current.filter((existing) => existing.id !== record.id),
            record,
        ].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
        consumptionsRef.current = updated;
        setConsumptions(updated);
    }

    async function saveMealRecord() {
        if (!mealForm) return;
        const recordedAt = parseMealDateTime(mealForm.date, mealForm.time);
        if (!recordedAt) {
            setError('Informe uma data e horário válidos (DD/MM/AAAA e HH:MM).');
            return;
        }
        if (savingMeal) return;
        const key = mealForm.plannedMealId
            ? `${mealForm.plannedMealId}:${recordedAt.getFullYear()}-${recordedAt.getMonth()}-${recordedAt.getDate()}`
            : null;
        if (key && pendingMealKeys.current.has(key)) return;
        if (key) pendingMealKeys.current.add(key);
        try {
            setSavingMeal(true);
            setError(null);
            const userId = session?.user.id ?? await userRepo.getCurrentUserId();
            if (!userId) throw new Error('É necessário estar logado para registrar uma refeição.');
            const consumption = createMealConsumption({
                userId,
                plannedMealId: mealForm.plannedMealId,
                activity: mealForm.activity,
                description: mealForm.description,
                notes: mealForm.notes,
                status: mealForm.status,
                recordedAt,
            });
            const existing = mealForm.plannedMealId
                ? consumptionsRef.current.find((record) => record.plannedMealId === mealForm.plannedMealId
                    && isSameLocalDay(record.recordedAt, recordedAt))
                : undefined;
            const savedConsumption = existing ? { ...consumption, id: existing.id } : consumption;
            await mealConsumptionRepo.saveMealConsumption(savedConsumption);
            saveConsumptionState(savedConsumption);
            setMealForm(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Erro ao registrar refeição.');
        } finally {
            if (key) pendingMealKeys.current.delete(key);
            setSavingMeal(false);
        }
    }

    async function quicklyRecordMeal(item: TimelineItem, status: MealConsumptionStatus) {
        const recordedAt = new Date();
        const key = `${item.id}:${recordedAt.getFullYear()}-${recordedAt.getMonth()}-${recordedAt.getDate()}`;
        if (pendingMealKeys.current.has(key)) return;
        pendingMealKeys.current.add(key);
        try {
            const userId = session?.user.id ?? await userRepo.getCurrentUserId();
            if (!userId) throw new Error('É necessário estar logado para registrar uma refeição.');
            const consumption = createMealConsumption({
                userId,
                plannedMealId: item.id,
                activity: item.activity,
                description: item.description,
                notes: null,
                status,
                recordedAt,
            });
            const existing = consumptionsRef.current.find((record) => record.plannedMealId === item.id
                && isSameLocalDay(record.recordedAt, consumption.recordedAt));
            const savedConsumption = existing ? { ...consumption, id: existing.id } : consumption;
            await mealConsumptionRepo.saveMealConsumption(savedConsumption);
            saveConsumptionState(savedConsumption);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Erro ao registrar refeição.');
        } finally {
            pendingMealKeys.current.delete(key);
        }
    }

    async function handleImportCsv() {
        try {
            setImporting(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) { setEditingVersion(false); return; }

            const uri = result.assets[0].uri;
            let csvContent: string;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                csvContent = await response.text();
            } else {
                csvContent = await FileSystem.readAsStringAsync(uri);
            }

            readRoutineCsv(csvContent);
            const plan = validateRoutineCsv(csvContent);
            const timezone = (await userRepo.getUser())?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
            const state = await routineRepo.getState();
            if (state.pending && state.pending.timezone !== timezone) setTimezoneWarning(`Fuso alterado para ${timezone}. Revalide a agenda pendente.`);
            else setTimezoneWarning(null);
            const proposal = proposeRoutine(state, plan, csvContent, timezone, new Date());
            setPreview({ content: csvContent, plan, proposal, timezone });
            setRoutineState(visibleRoutine(state, new Date()));
            setError(null);
        } catch (err) {
            const detail = err instanceof Error ? err.message : '';
            setError(detail ? `Erro ao importar CSV: ${detail}` : 'Erro ao importar CSV');
        } finally {
            setImporting(false);
        }
    }

    async function confirmImport() {
        if (!preview) return;
        try {
            setImporting(true);
            const timezone = (await userRepo.getUser())?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
            if (editingVersion && viewed) {
                const current = visibleRoutine(await routineRepo.getState(), new Date());
                const target = current[viewedVersion] ?? current.active ?? current.pending;
                if (target?.id !== viewed.id || preview.proposal.version.anchorDay !== viewed.anchorDay || preview.proposal.version.anchorTime !== viewed.anchorTime || preview.timezone !== timezone) {
                    throw new Error('Prévia expirada: recalcule e confirme novamente');
                }
                await routineRepo.edit(viewed.id, preview.plan, new Date());
            }
            else await routineRepo.confirm(preview.proposal, new Date(), timezone);
            setPreview(null);
            setEditingVersion(false);
            await loadEntries();
            setTimezoneWarning(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao confirmar importação');
            setPreview(null);
        } finally { setImporting(false); }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    const currentRoutine = visibleRoutine(routineState, new Date());
    const viewed = currentRoutine[viewedVersion] ?? currentRoutine.active ?? currentRoutine.pending;
    const timeline = viewed ? (viewed.rows ?? []).map((row) => ({
        id: row.id ?? String(row.line), day: row.day, time: row.time, activity: row.activity,
        description: row.description, objective: row.focus,
        kind: (['Calistenia', 'Musculação', 'HIT'].includes(row.activity) ? 'workout' : 'meal') as 'meal' | 'workout',
    })) : buildTimeline(entries, workouts);
    const selectedOrder = dayFilter === 'all' ? null : dayFilter === 'today' ? todayDayOrder() : parseInt(dayFilter, 10);
    const filteredTimeline =
        selectedOrder === null
            ? timeline
            : timeline.filter((item) => (DAY_ORDER[item.day.trim().toLowerCase()] ?? -1) === selectedOrder);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TypographyText variant="h2" color={Colors.textPrimary}>
                    Plano do Dia
                </TypographyText>
                <TouchableOpacity
                    style={[styles.importBtn, importing && styles.importBtnDisabled]}
                    onPress={handleImportCsv}
                    disabled={importing}
                >
                    <TypographyText variant="label" color={Colors.primary}>
                        {importing ? 'Importando...' : '↑ CSV'}
                    </TypographyText>
                </TouchableOpacity>
            </View>
            <View style={styles.recordMealAction}>
                <Button label="Registrar refeição avulsa" onPress={() => openMealForm()} variant="secondary" />
            </View>
            {viewed && <View style={{ paddingHorizontal: Spacing.md }}>
                <TypographyText variant="bodySmall" color={Colors.textSecondary}>Versão {routineState[viewedVersion] ? viewedVersion : viewed === routineState.active ? 'active' : 'pending'}: {viewed.startsAt.toLocaleString('pt-BR', { timeZone: viewed.timezone })} ({viewed.timezone})</TypographyText>
                {routineState.active && routineState.pending && <Button label={viewedVersion === 'active' ? 'Ver pendente' : 'Ver ativa'} onPress={() => setViewedVersion((previous) => previous === 'active' ? 'pending' : 'active')} />}
                <Button label="Editar versão exibida por CSV" onPress={() => { setEditingVersion(true); void handleImportCsv(); }} />
                {viewed.rows && viewed.rows.length > 0 && <TypographyText variant="bodySmall" color={Colors.textSecondary}>Semana recorrente ancorada em {viewed.anchorDay} às {viewed.anchorTime}.</TypographyText>}
            </View>}

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
            )}
            {timezoneWarning && <TypographyText variant="bodySmall" color={Colors.error}>{timezoneWarning}</TypographyText>}
            {preview && <View style={{ padding: Spacing.md }}>
                <TypographyText variant="h4" color={Colors.textPrimary}>Prévia da rotina</TypographyText>
                <TypographyText variant="body" color={Colors.textSecondary}>Início: {preview.proposal.startsAt.toLocaleString('pt-BR', { timeZone: preview.timezone })} ({preview.timezone})</TypographyText>
                <TypographyText variant="body" color={Colors.textSecondary}>Substitui: {preview.proposal.replaces ?? 'nenhuma versão'} • ativa: {routineState.active?.id ?? 'nenhuma'} • pendente: {routineState.pending?.id ?? 'nenhuma'}</TypographyText>
                {preview.proposal.replaces && <TypographyText variant="bodySmall" color={Colors.error}>Confirme a substituição da versão {preview.proposal.replaces}.</TypographyText>}
                {preview.plan.rows.map((row) => <TypographyText key={row.line} variant="bodySmall" color={Colors.textPrimary}>
                    {row.day} {row.time} • {row.activity}: {row.description} ({row.focus})
                </TypographyText>)}
                <Button label={editingVersion ? 'Confirmar edição' : 'Confirmar importação'} onPress={confirmImport} loading={importing} />
                <Button label="Cancelar prévia" onPress={() => { setPreview(null); setEditingVersion(false); }} />
            </View>}
            {mealForm && (
                <ScrollView
                    style={styles.mealForm}
                    contentContainerStyle={styles.mealFormContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TypographyText variant="h4" color={Colors.textPrimary}>
                        {mealForm.plannedMealId ? 'Registrar refeição planejada' : 'Registrar refeição avulsa'}
                    </TypographyText>
                    <Input label="Refeição" value={mealForm.activity}
                        onChangeText={(activity) => setMealForm((current) => current ? { ...current, activity } : current)}
                        placeholder="Ex: Almoço" />
                    <Input label="O que comeu ou motivo do pulo" value={mealForm.description}
                        onChangeText={(description) => setMealForm((current) => current ? { ...current, description } : current)}
                        placeholder="Descrição da refeição" multiline />
                    <Input label="Notas ou substituição" value={mealForm.notes}
                        onChangeText={(notes) => setMealForm((current) => current ? { ...current, notes } : current)}
                        placeholder="Opcional" />
                    <Input label="Data (DD/MM/AAAA)" value={mealForm.date}
                        onChangeText={(date) => setMealForm((current) => current ? { ...current, date } : current)}
                        placeholder="DD/MM/AAAA" />
                    <Input label="Horário (HH:MM)" value={mealForm.time}
                        onChangeText={(time) => setMealForm((current) => current ? { ...current, time } : current)}
                        placeholder="HH:MM" />
                    <View style={styles.mealFormActions}>
                        <Button label="Consumida"
                            onPress={() => setMealForm((current) => current ? { ...current, status: 'consumed' } : current)}
                            variant={mealForm.status === 'consumed' ? 'primary' : 'secondary'} />
                        <Button label="Pulada"
                            onPress={() => setMealForm((current) => current ? { ...current, status: 'skipped' } : current)}
                            variant={mealForm.status === 'skipped' ? 'primary' : 'secondary'} />
                        <Button label="Salvar registro" onPress={saveMealRecord} loading={savingMeal} />
                        <Button label="Cancelar" onPress={() => setMealForm(null)} variant="secondary" />
                    </View>
                </ScrollView>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterRow}
                contentContainerStyle={styles.filterRowContent}
            >
                {FILTER_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[styles.filterChip, dayFilter === option.key && styles.filterChipActive]}
                        onPress={() => setDayFilter(option.key)}
                    >
                        <TypographyText
                            variant="label"
                            color={dayFilter === option.key ? Colors.white : Colors.textSecondary}
                        >
                            {option.label}
                        </TypographyText>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {timeline.length === 0 ? (
                <EmptyState
                    icon="🍽️"
                    title="Sem plano"
                    message="Importe um arquivo CSV para criar seu plano de refeições e treinos."
                    action={{ label: 'Importar CSV', onPress: handleImportCsv }}
                />
            ) : filteredTimeline.length === 0 ? (
                <EmptyState
                    icon="📅"
                    title="Nada por aqui"
                    message="Nenhuma atividade cadastrada para esse dia."
                />
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredTimeline.map((item) => (
                        <Card
                            key={item.id}
                            style={styles.entryCard}
                            onPress={item.kind === 'workout' ? () => {
                                const rowIndex = viewed?.rows?.findIndex((row) => row.id === item.id) ?? -1;
                                const workoutIndex = rowIndex < 0 ? -1 : viewed!.rows!.slice(0, rowIndex + 1).filter((row) => ['Calistenia', 'Musculação', 'HIT'].includes(row.activity)).length - 1;
                                const workout = viewed
                                    ? workoutIndex >= 0 && ['Calistenia', 'Musculação', 'HIT'].includes(viewed.rows![rowIndex].activity)
                                        ? viewed.workouts[workoutIndex] : undefined
                                    : workouts.find((candidate) => candidate.id === item.id);
                                if (workout) setSelectedWorkout(workout);
                            } : undefined}
                        >
                            <View style={styles.entryHeader}>
                                <TypographyText variant="h4" color={Colors.primary}>
                                    {item.time}
                                </TypographyText>
                                <TypographyText variant="label" color={Colors.textSecondary}>
                                    {item.day}
                                </TypographyText>
                            </View>
                            <TypographyText variant="h4" color={Colors.textPrimary} style={{ marginTop: Spacing.xs }}>
                                {item.activity}
                            </TypographyText>
                            <TypographyText variant="body" color={Colors.textSecondary} style={{ marginTop: 2 }}>
                                {item.description}
                            </TypographyText>
                            {item.objective ? (
                                <TypographyText
                                    variant="bodySmall"
                                    color={Colors.textDisabled}
                                    style={styles.objective}
                                >
                                    {item.objective}
                                </TypographyText>
                            ) : null}
                            {item.kind === 'meal' && (
                                <View style={styles.mealActions}>
                                    {consumptions.find((record) => record.plannedMealId === item.id
                                        && isSameLocalDay(record.recordedAt, new Date())) && (
                                        <TypographyText variant="bodySmall" color={Colors.success}>
                                            Registrada hoje: {consumptions.find((record) => record.plannedMealId === item.id
                                                && isSameLocalDay(record.recordedAt, new Date()))?.status === 'consumed' ? 'consumida' : 'pulada'}
                                        </TypographyText>
                                    )}
                                    <Button label="Comi conforme planejado"
                                        onPress={() => void quicklyRecordMeal(item, 'consumed')} />
                                    <Button label="Pular refeição"
                                        onPress={() => void quicklyRecordMeal(item, 'skipped')} variant="ghost" />
                                    <Button label="Substituir ou adicionar nota"
                                        onPress={() => openMealForm(item)} variant="secondary" />
                                </View>
                            )}
                        </Card>
                    ))}
                </ScrollView>
            )}
            <WorkoutDetailModal
                visible={selectedWorkout !== null}
                workout={selectedWorkout}
                onClose={() => setSelectedWorkout(null)}
                onStart={(workout) => {
                    setSelectedWorkout(null);
                    router.push(`/workout/active?id=${workout.id}`);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    importBtn: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8,
    },
    importBtnDisabled: { opacity: 0.5 },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    filterRow: { flexGrow: 0, marginBottom: Spacing.sm },
    filterRowContent: { paddingHorizontal: Spacing.md, gap: Spacing.xs, paddingBottom: Spacing.xs },
    filterChip: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.xs,
        maxWidth: 120,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    list: { flex: 1 },
    listContent: { padding: Spacing.md, gap: Spacing.sm },
    entryCard: { gap: 2, overflow: 'hidden' },
    recordMealAction: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    mealForm: { flexGrow: 0, maxHeight: 360, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: 8, backgroundColor: Colors.surface },
    mealFormContent: { padding: Spacing.md, gap: Spacing.sm },
    mealFormActions: { gap: Spacing.xs },
    mealActions: { gap: Spacing.xs, marginTop: Spacing.sm },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    objective: { marginTop: Spacing.xs, fontStyle: 'italic' },
});
