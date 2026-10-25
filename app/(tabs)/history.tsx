import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Card } from '../../src/ui/components/Card';
import { Button } from '../../src/ui/components/Button';
import { Input } from '../../src/ui/components/Input';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { Colors, Spacing, Typography } from '../../src/ui/theme';
import { WeightRecord } from '../../src/domain/entities/WeightRecord';
import { WorkoutSession } from '../../src/domain/entities/WorkoutSession';
import { MealConsumption, MealConsumptionStatus } from '../../src/domain/entities/MealConsumption';
import { recordWeight } from '../../src/domain/use-cases/weight/RecordWeight';
import { parseLocalizedDecimal } from '../../src/domain/value-objects/LocalizedDecimal';
import { formatMealDateInput, formatMealTimeInput, parseMealDateTime } from '../../src/domain/use-cases/meal/MealConsumptionInput';
import { confirmAsync } from '../../src/ui/utils/dialogs';
import { useAuth } from '../../src/ui/hooks/useAuth';

type HistoryTab = 'weight' | 'workouts' | 'meals';

export default function HistoryScreen() {
    const { weightRepo, workoutRepo, mealConsumptionRepo, userRepo } = useRepositories();
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState<HistoryTab>('weight');

    const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [meals, setMeals] = useState<MealConsumption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingSet, setEditingSet] = useState<{ sessionId: string; setId: string } | null>(null);
    const [editReps, setEditReps] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editStartedAt, setEditStartedAt] = useState<Record<string, string>>({});
    const [editingMealId, setEditingMealId] = useState<string | null>(null);
    const [editMealActivity, setEditMealActivity] = useState('');
    const [editMealDescription, setEditMealDescription] = useState('');
    const [editMealNotes, setEditMealNotes] = useState('');
    const [editMealDate, setEditMealDate] = useState('');
    const [editMealTime, setEditMealTime] = useState('');
    const [editMealStatus, setEditMealStatus] = useState<MealConsumptionStatus>('consumed');

    // New weight form
    const [showWeightForm, setShowWeightForm] = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [bodyFatInput, setBodyFatInput] = useState('');
    const [proteinInput, setProteinInput] = useState('');
    const [savingWeight, setSavingWeight] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        try {
            setLoading(true);
            const [wh, ss, ml] = await Promise.all([
                weightRepo.getWeightHistory(),
                workoutRepo.getWorkoutSessions(),
                mealConsumptionRepo.getMealConsumptions(),
            ]);
            setWeightHistory(wh.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()));
            setSessions(ss.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()));
            setMeals(ml);
        } catch {
            setError('Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    }

    function beginMealCorrection(meal: MealConsumption) {
        setEditingMealId(meal.id);
        setEditMealActivity(meal.activity);
        setEditMealDescription(meal.description);
        setEditMealNotes(meal.notes ?? '');
        setEditMealDate(formatMealDateInput(meal.recordedAt));
        setEditMealTime(formatMealTimeInput(meal.recordedAt));
        setEditMealStatus(meal.status);
    }

    async function saveMealCorrection(meal: MealConsumption) {
        const recordedAt = parseMealDateTime(editMealDate, editMealTime);
        if (!recordedAt) { setError('Informe uma data e horário válidos (DD/MM/AAAA e HH:MM).'); return; }
        if (!editMealActivity.trim() || !editMealDescription.trim()) { setError('Informe a refeição e sua descrição.'); return; }
        const updated: MealConsumption = {
            ...meal,
            activity: editMealActivity.trim(),
            description: editMealDescription.trim(),
            notes: editMealNotes.trim() || null,
            recordedAt,
            status: editMealStatus,
        };
        try {
            await mealConsumptionRepo.saveMealConsumption(updated);
            setMeals((current) => current.map((entry) => entry.id === updated.id ? updated : entry)
                .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()));
            setEditingMealId(null);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Erro ao corrigir refeição.');
        }
    }

    async function deleteMeal(meal: MealConsumption) {
        const confirmed = await confirmAsync('Excluir registro?', `O registro de ${meal.activity} será removido do histórico.`);
        if (!confirmed) return;
        try {
            await mealConsumptionRepo.deleteMealConsumption(meal.id);
            setMeals((current) => current.filter((entry) => entry.id !== meal.id));
            if (editingMealId === meal.id) setEditingMealId(null);
            setError(null);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Erro ao excluir refeição.');
        }
    }

    async function handleLogWeight() {
        const kg = parseLocalizedDecimal(weightInput);
        const bf = bodyFatInput.trim() ? parseLocalizedDecimal(bodyFatInput) : null;
        const prot = proteinInput.trim() ? parseLocalizedDecimal(proteinInput) : null;
        if (kg === null || (bodyFatInput.trim() && bf === null) || (proteinInput.trim() && prot === null)) {
            setError('Informe números válidos; use vírgula ou ponto como separador decimal.');
            return;
        }
        if (kg <= 0) { setError('O peso deve ser maior que zero'); return; }
        if ((bf !== null && (bf < 0 || bf > 100)) || (prot !== null && (prot < 0 || prot > 100))) {
            setError('Percentuais devem estar entre 0 e 100');
            return;
        }
        try {
            setSavingWeight(true);
            setError(null);
            const userId = session?.user.id ?? await userRepo.getCurrentUserId();
            if (!userId) {
                setError('É necessário estar logado para registrar peso');
                return;
            }
            await recordWeight(weightRepo, userId, kg, bf, prot);
            const updated = await weightRepo.getWeightHistory();
            setWeightHistory(updated.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()));
            setWeightInput('');
            setBodyFatInput('');
            setProteinInput('');
            setShowWeightForm(false);
        } catch {
            setError('Erro ao registrar peso');
        } finally {
            setSavingWeight(false);
        }
    }

    function formatDate(date: Date): string {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function sessionDuration(session: WorkoutSession): string {
        if (!session.finishedAt) return 'Em andamento';
        const min = Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 60000);
        return `${min} min`;
    }

    async function saveSetCorrection() {
        if (!editingSet) return;
        const reps = Number(editReps);
        if (!Number.isInteger(reps) || reps < 0) { setError('Repetições inválidas'); return; }
        const weight = editWeight.trim() ? parseLocalizedDecimal(editWeight) : null;
        if (editWeight.trim() && weight === null) { setError('Informe uma carga válida'); return; }
        if (weight !== null && weight < 0) { setError('A carga não pode ser negativa'); return; }
        const session = sessions.find((candidate) => candidate.id === editingSet.sessionId);
        if (!session) return;
        const original = session.sets.find((set) => set.id === editingSet.setId);
        const duration = original?.durationSeconds == null ? null : Number(editDuration);
        if (duration !== null && (!Number.isInteger(duration) || duration < 0)) { setError('Duração inválida'); return; }
        const updated = { ...session, sets: session.sets.map((set) => set.id === editingSet.setId ? { ...set, repsCompleted: reps, weightUsedKg: weight, durationSeconds: duration } : set) };
        try {
            await workoutRepo.saveWorkoutSession(updated);
            setSessions((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
            setEditingSet(null);
            setError(null);
        } catch { setError('Erro ao corrigir série'); }
    }

    async function saveSessionDate(session: WorkoutSession) {
        const date = new Date(editStartedAt[session.id] ?? session.startedAt.toISOString());
        if (!Number.isFinite(date.getTime())) { setError('Data inválida'); return; }
        const updated = { ...session, startedAt: date };
        try {
            await workoutRepo.saveWorkoutSession(updated);
            setSessions((current) => current.map((candidate) => candidate.id === session.id ? updated : candidate));
            setError(null);
        } catch { setError('Erro ao corrigir data'); }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    const tabs: { key: HistoryTab; label: string }[] = [
        { key: 'weight', label: 'Peso' },
        { key: 'workouts', label: 'Treinos' },
        { key: 'meals', label: 'Refeições' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <TypographyText variant="h2" color={Colors.textPrimary} style={styles.title}>
                Histórico
            </TypographyText>

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
            )}

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text
                            style={[
                                Typography.label,
                                { color: activeTab === tab.key ? Colors.primary : Colors.textSecondary },
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Weight Tab */}
                {activeTab === 'weight' && (
                    <>
                        <Button
                            label={showWeightForm ? 'Cancelar' : '+ Registrar Peso'}
                            onPress={() => setShowWeightForm((v) => !v)}
                            variant={showWeightForm ? 'ghost' : 'primary'}
                            style={styles.actionBtn}
                        />

                        {showWeightForm && (
                            <Card style={styles.formCard}>
                                <Input
                                    label="Peso (kg)"
                                    placeholder="Ex: 75.5"
                                    value={weightInput}
                                    onChangeText={setWeightInput}
                                    keyboardType="decimal-pad"
                                />
                                <Input
                                    label="Gordura Corporal (%)"
                                    placeholder="Ex: 18.5"
                                    value={bodyFatInput}
                                    onChangeText={setBodyFatInput}
                                    keyboardType="decimal-pad"
                                    style={{ marginTop: Spacing.sm }}
                                />
                                <Input
                                    label="Proteína (%)"
                                    placeholder="Ex: 22.0"
                                    value={proteinInput}
                                    onChangeText={setProteinInput}
                                    keyboardType="decimal-pad"
                                    style={{ marginTop: Spacing.sm }}
                                />
                                <Button
                                    label="Salvar"
                                    onPress={handleLogWeight}
                                    loading={savingWeight}
                                    style={{ marginTop: Spacing.md }}
                                />
                            </Card>
                        )}

                        {weightHistory.length === 0 ? (
                            <EmptyState icon="⚖️" title="Sem registros" message="Registre seu primeiro peso acima." />
                        ) : (
                            weightHistory.map((record) => (
                                <Card key={record.id} style={styles.historyCard}>
                                    <View style={styles.historyRow}>
                                        <TypographyText variant="h4" color={Colors.textPrimary}>
                                            {record.weightKg.toLocaleString('pt-BR')} kg
                                        </TypographyText>
                                        <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                            {formatDate(record.recordedAt)}
                                        </TypographyText>
                                    </View>
                                    <View style={styles.historyRow}>
                                        {record.bodyFatPercentage !== null && (
                                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                                Gordura: {record.bodyFatPercentage.toLocaleString('pt-BR')}%
                                            </TypographyText>
                                        )}
                                        {record.proteinPercentage !== null && (
                                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                                Proteína: {record.proteinPercentage.toLocaleString('pt-BR')}%
                                            </TypographyText>
                                        )}
                                    </View>
                                </Card>
                            ))
                        )}
                    </>
                )}

                {/* Workouts Tab */}
                {activeTab === 'workouts' && (
                    <>
                        {sessions.length === 0 ? (
                            <EmptyState icon="🏋️" title="Sem sessões" message="Complete um treino para ver o histórico." />
                        ) : (
                            sessions.map((session) => (
                                <Card key={session.id} style={styles.historyCard}>
                                    <View style={styles.historyRow}>
                                        <TypographyText variant="h4" color={Colors.textPrimary}>
                                            {session.workoutName ?? 'Treino sem nome registrado'}
                                        </TypographyText>
                                        <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                            {formatDate(session.startedAt)}
                                        </TypographyText>
                                    </View>
                                    <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                        {session.sets.length} séries • {sessionDuration(session)}
                                    </TypographyText>
                                    <TextInput accessibilityLabel={`Data da sessão ${session.id}`} value={editStartedAt[session.id] ?? session.startedAt.toISOString()} onChangeText={(value) => setEditStartedAt((current) => ({ ...current, [session.id]: value }))} />
                                    <Button label={`Corrigir data ${session.id}`} onPress={() => saveSessionDate(session)} />
                                    <TypographyText variant="bodySmall" color={Colors.success}>
                                        {session.status === 'partial' ? 'Parcial' : session.finishedAt ? 'Concluído' : 'Em andamento'}
                                    </TypographyText>
                                    {session.sets.map((set) => (
                                        <View key={set.id}>
                                        <TypographyText key={set.id} variant="bodySmall" color={Colors.textSecondary}>
                                            {set.exerciseName ?? 'Exercício sem nome'} • série {set.setNumber}
                                            {set.durationSeconds == null ? ` • ${set.repsCompleted} reps` : ''}
                                            {set.prescribedReps != null ? ` (previsto ${set.prescribedReps})` : ''}
                                            {set.weightUsedKg != null ? ` • ${set.weightUsedKg.toLocaleString('pt-BR')} kg` : ''}
                                            {set.durationSeconds != null ? ` • ${set.durationSeconds}s` : ''}
                                            {set.prescribedDurationSeconds != null ? ` (previsto ${set.prescribedDurationSeconds}s)` : ''}
                                        </TypographyText>
                                        <Button label={`Corrigir série ${set.setNumber}`} onPress={() => {
                                            setEditingSet({ sessionId: session.id, setId: set.id });
                                            setEditReps(String(set.repsCompleted));
                                            setEditWeight(set.weightUsedKg == null ? '' : String(set.weightUsedKg));
                                            setEditDuration(set.durationSeconds == null ? '' : String(set.durationSeconds));
                                        }} />
                                        {editingSet?.setId === set.id && (
                                            <View>
                                                <TextInput accessibilityLabel="Repetições corrigidas" value={editReps} onChangeText={setEditReps} keyboardType="number-pad" />
                                                <TextInput accessibilityLabel="Carga corrigida em kg" value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" />
                                                {set.durationSeconds != null && <TextInput accessibilityLabel="Duração corrigida em segundos" value={editDuration} onChangeText={setEditDuration} keyboardType="number-pad" />}
                                                <Button label="Salvar correção" onPress={saveSetCorrection} />
                                            </View>
                                        )}
                                        </View>
                                    ))}
                                </Card>
                            ))
                        )}
                    </>
                )}

                {/* Meals Tab */}
                {activeTab === 'meals' && (
                    <>
                        {meals.length === 0 ? (
                            <EmptyState icon="🍽️" title="Sem refeições registradas" message="Registre refeições consumidas ou puladas na aba Plano." />
                        ) : (
                            meals.map((meal) => (
                                <Card key={meal.id} style={styles.historyCard}>
                                    <View style={styles.historyRow}>
                                        <TypographyText variant="h4" color={Colors.primary}>
                                        {meal.recordedAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </TypographyText>
                                        <TypographyText variant="label" color={Colors.textSecondary}>
                                        {meal.status === 'consumed' ? 'Consumida' : 'Pulada'}
                                        </TypographyText>
                                    </View>
                                    <TypographyText variant="h4" color={Colors.textPrimary}>
                                        {meal.activity}
                                    </TypographyText>
                                    <TypographyText variant="body" color={Colors.textSecondary}>
                                        {meal.description}
                                    </TypographyText>
                                    {meal.notes && <TypographyText variant="bodySmall" color={Colors.textSecondary}>Notas: {meal.notes}</TypographyText>}
                                    <View style={styles.mealHistoryActions}>
                                        <Button label="Corrigir registro" onPress={() => beginMealCorrection(meal)} variant="secondary" />
                                        <Button label="Excluir registro" onPress={() => void deleteMeal(meal)} variant="danger" />
                                    </View>
                                    {editingMealId === meal.id && (
                                        <View style={styles.formCard}>
                                        <Input label="Refeição" value={editMealActivity} onChangeText={setEditMealActivity} />
                                        <Input label="Descrição ou motivo do pulo" value={editMealDescription} onChangeText={setEditMealDescription} multiline />
                                        <Input label="Notas ou substituição" value={editMealNotes} onChangeText={setEditMealNotes} />
                                        <Input label="Data (DD/MM/AAAA)" value={editMealDate} onChangeText={setEditMealDate} />
                                        <Input label="Horário (HH:MM)" value={editMealTime} onChangeText={setEditMealTime} />
                                        <View style={styles.mealHistoryActions}>
                                            <Button label="Consumida" onPress={() => setEditMealStatus('consumed')} variant={editMealStatus === 'consumed' ? 'primary' : 'secondary'} />
                                            <Button label="Pulada" onPress={() => setEditMealStatus('skipped')} variant={editMealStatus === 'skipped' ? 'primary' : 'secondary'} />
                                        </View>
                                        <Button label="Salvar correção" onPress={() => void saveMealCorrection(meal)} />
                                        <Button label="Cancelar" onPress={() => setEditingMealId(null)} variant="ghost" />
                                        </View>
                                    )}
                                </Card>
                            ))
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    title: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: Spacing.md,
        borderRadius: 8,
        backgroundColor: Colors.surface,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.sm },
    actionBtn: { marginBottom: Spacing.sm },
    formCard: { gap: Spacing.xs, marginBottom: Spacing.sm },
    historyCard: { gap: Spacing.xs },
    mealHistoryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
