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
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { recordWeight } from '../../src/domain/use-cases/weight/RecordWeight';

type HistoryTab = 'weight' | 'workouts' | 'meals';

export default function HistoryScreen() {
    const { weightRepo, workoutRepo, mealRepo, userRepo } = useRepositories();
    const [activeTab, setActiveTab] = useState<HistoryTab>('weight');

    const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [meals, setMeals] = useState<MealPlanEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingSet, setEditingSet] = useState<{ sessionId: string; setId: string } | null>(null);
    const [editReps, setEditReps] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editStartedAt, setEditStartedAt] = useState<Record<string, string>>({});

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
                mealRepo.getMealPlanEntries(),
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

    async function handleLogWeight() {
        const kg = parseFloat(weightInput);
        if (isNaN(kg) || kg <= 0) return;
        const bf = bodyFatInput ? parseFloat(bodyFatInput) : null;
        const prot = proteinInput ? parseFloat(proteinInput) : null;
        try {
            setSavingWeight(true);
            setError(null);
            const userId = await userRepo.getCurrentUserId();
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
        const weight = editWeight.trim() ? Number(editWeight.replace(',', '.')) : null;
        if (weight !== null && (!Number.isFinite(weight) || weight < 0)) { setError('Carga inválida'); return; }
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
                                            {record.weightKg} kg
                                        </TypographyText>
                                        <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                            {formatDate(record.recordedAt)}
                                        </TypographyText>
                                    </View>
                                    <View style={styles.historyRow}>
                                        {record.bodyFatPercentage !== null && (
                                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                                Gordura: {record.bodyFatPercentage}%
                                            </TypographyText>
                                        )}
                                        {record.proteinPercentage !== null && (
                                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                                Proteína: {record.proteinPercentage}%
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
                            <EmptyState icon="🍽️" title="Sem plano" message="Importe um plano na aba Plano." />
                        ) : (
                            meals.map((meal) => (
                                <Card key={meal.id} style={styles.historyCard}>
                                    <View style={styles.historyRow}>
                                        <TypographyText variant="h4" color={Colors.primary}>
                                            {meal.time}
                                        </TypographyText>
                                        <TypographyText variant="label" color={Colors.textSecondary}>
                                            {meal.day}
                                        </TypographyText>
                                    </View>
                                    <TypographyText variant="h4" color={Colors.textPrimary}>
                                        {meal.activity}
                                    </TypographyText>
                                    <TypographyText variant="body" color={Colors.textSecondary}>
                                        {meal.description}
                                    </TypographyText>
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
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
