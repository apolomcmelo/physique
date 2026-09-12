import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Workout, WorkoutType, createExercise, createWorkout } from '../../src/domain/entities/Workout';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Input } from '../../src/ui/components/Input';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { confirmAsync } from '../../src/ui/utils/dialogs';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

interface ExerciseForm {
    name: string;
    sets: string;
    reps: string;
    weight: string;
}

type DayFilter = 'today' | number | 'unscheduled' | 'all';
type SortOption = 'schedule' | 'name' | 'exerciseCount';

const dayFilters: Array<{ label: string; value: DayFilter }> = [
    { label: 'Hoje', value: 'today' },
    { label: 'Segunda', value: 1 },
    { label: 'Terça', value: 2 },
    { label: 'Quarta', value: 3 },
    { label: 'Quinta', value: 4 },
    { label: 'Sexta', value: 5 },
    { label: 'Sábado', value: 6 },
    { label: 'Domingo', value: 0 },
    { label: 'Sem agendamento', value: 'unscheduled' },
    { label: 'Todos', value: 'all' },
];

const typeFilters: Array<{ label: string; value: WorkoutType | 'all' }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Calistenia', value: 'Calisthenics' },
    { label: 'HIT', value: 'HIT' },
    { label: 'Musculação', value: 'Weightlifting' },
];

const sortOptions: Array<{ label: string; value: SortOption }> = [
    { label: 'Horário', value: 'schedule' },
    { label: 'Nome (A-Z)', value: 'name' },
    { label: 'Exercícios', value: 'exerciseCount' },
];

/** Earliest scheduled workout first; unscheduled workouts go last. */
function sortWorkoutsByScheduledAt(workouts: Workout[]): Workout[] {
    return [...workouts].sort((a, b) => {
        if (!a.scheduledAt && !b.scheduledAt) return 0;
        if (!a.scheduledAt) return 1;
        if (!b.scheduledAt) return -1;
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
}

function compareBySchedule(a: Workout, b: Workout): number {
    if (!a.scheduledAt && !b.scheduledAt) return 0;
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return a.scheduledAt.getTime() - b.scheduledAt.getTime();
}

export default function WorkoutScreen() {
    const { workoutRepo } = useRepositories();
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [dayFilter, setDayFilter] = useState<DayFilter>('all');
    const [typeFilter, setTypeFilter] = useState<WorkoutType | 'all'>('all');
    const [sortOption, setSortOption] = useState<SortOption>('schedule');

    // Add form state
    const [name, setName] = useState('');
    const [type, setType] = useState<WorkoutType>('Calisthenics');
    const [scheduledAt, setScheduledAt] = useState('');
    const [exercises, setExercises] = useState<ExerciseForm[]>([
        { name: '', sets: '', reps: '', weight: '' },
    ]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        loadWorkouts();
    }, []);

    async function loadWorkouts() {
        try {
            setLoading(true);
            const data = await workoutRepo.getWorkouts();
            setWorkouts(sortWorkoutsByScheduledAt(data));
        } catch {
            setError('Erro ao carregar treinos');
        } finally {
            setLoading(false);
        }
    }

    function addExerciseRow() {
        setExercises((prev) => [...prev, { name: '', sets: '', reps: '', weight: '' }]);
    }

    function formatDateTimeInput(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function resetForm() {
        setEditingWorkout(null);
        setName('');
        setType('Calisthenics');
        setScheduledAt('');
        setExercises([{ name: '', sets: '', reps: '', weight: '' }]);
        setFormError(null);
    }

    function openNewForm() {
        resetForm();
        setShowForm(true);
    }

    function openEditForm(workout: Workout) {
        setSelectedWorkout(null);
        setEditingWorkout(workout);
        setName(workout.name);
        setType(workout.type);
        setScheduledAt(workout.scheduledAt ? formatDateTimeInput(workout.scheduledAt) : '');
        setExercises(
            workout.exercises.length > 0
                ? workout.exercises.map((e) => ({
                    name: e.name,
                    sets: e.sets !== null ? String(e.sets) : '',
                    reps: e.repsPerSet !== null ? String(e.repsPerSet) : '',
                    weight: e.weightKg !== null ? String(e.weightKg) : '',
                }))
                : [{ name: '', sets: '', reps: '', weight: '' }],
        );
        setFormError(null);
        setShowForm(true);
    }

    async function handleDelete(workout: Workout) {
        const confirmed = await confirmAsync(
            'Excluir treino',
            `Excluir "${workout.name}"? Esta ação não pode ser desfeita.`,
        );
        if (!confirmed) return;

        try {
            await workoutRepo.deleteWorkout(workout.id);
            await loadWorkouts();
        } catch {
            setError('Erro ao excluir treino');
        }
    }

    function removeExerciseRow(index: number) {
        setExercises((prev) => prev.filter((_, i) => i !== index));
    }

    function updateExercise(index: number, field: keyof ExerciseForm, value: string) {
        setExercises((prev) =>
            prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
        );
    }

    async function handleSave() {
        if (!name.trim()) {
            setFormError('Nome do treino é obrigatório');
            return;
        }

        const builtExercises = exercises
            .filter((ex) => ex.name.trim())
            .map((ex) =>
                createExercise({
                    name: ex.name.trim(),
                    sets: ex.sets ? parseInt(ex.sets, 10) : null,
                    repsPerSet: ex.reps ? parseInt(ex.reps, 10) : null,
                    weightKg: ex.weight ? parseFloat(ex.weight) : null,
                    durationSeconds: null,
                    notes: null,
                }),
            );

        try {
            setSaving(true);
            setFormError(null);
            if (editingWorkout) {
                await workoutRepo.updateWorkout({
                    ...editingWorkout,
                    name: name.trim(),
                    type,
                    exercises: builtExercises,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                });
            } else {
                const workout = createWorkout({
                    name: name.trim(),
                    type,
                    exercises: builtExercises,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                });
                await workoutRepo.saveWorkout(workout);
            }
            await loadWorkouts();
            setShowForm(false);
            resetForm();
        } catch (e) {
            setFormError('Erro ao salvar treino');
        } finally {
            setSaving(false);
        }
    }

    function formatSchedule(workout: Workout): string {
        if (!workout.scheduledAt) return 'Sem horário';
        const d = workout.scheduledAt;
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const typeColors: Record<WorkoutType, string> = {
        HIT: Colors.error,
        Calisthenics: Colors.primary,
        Weightlifting: Colors.warning,
    };

    const visibleWorkouts = sortWorkoutsByScheduledAt(workouts)
        .filter((workout) => {
            if (dayFilter === 'all') return true;
            if (dayFilter === 'unscheduled') return workout.scheduledAt === null;
            if (!workout.scheduledAt) return false;
            if (dayFilter === 'today') {
                const today = new Date();
                return workout.scheduledAt.toDateString() === today.toDateString();
            }
            return workout.scheduledAt.getDay() === dayFilter;
        })
        .filter((workout) => typeFilter === 'all' || workout.type === typeFilter)
        .sort((a, b) => {
            if (sortOption === 'name') return a.name.localeCompare(b.name, 'pt-BR');
            if (sortOption === 'exerciseCount') return a.exercises.length - b.exercises.length;
            return compareBySchedule(a, b);
        });

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.topBar}>
                <TypographyText variant="h2" color={Colors.textPrimary}>
                    Treinos
                </TypographyText>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => (showForm ? (setShowForm(false), resetForm()) : openNewForm())}
                >
                    <TypographyText variant="label" color={Colors.primary}>
                        {showForm ? '✕ Fechar' : '+ Novo'}
                    </TypographyText>
                </TouchableOpacity>
            </View>

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {dayFilters.map((filter) => (
                    <TouchableOpacity
                        key={filter.label}
                        style={[styles.filterChip, dayFilter === filter.value && styles.activeFilterChip]}
                        onPress={() => setDayFilter(filter.value)}
                    >
                        <TypographyText
                            variant="label"
                            color={dayFilter === filter.value ? Colors.background : Colors.textSecondary}
                        >
                            {filter.label}
                        </TypographyText>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {typeFilters.map((filter) => (
                    <TouchableOpacity
                        key={filter.label}
                        style={[styles.filterChip, typeFilter === filter.value && styles.activeFilterChip]}
                        onPress={() => setTypeFilter(filter.value)}
                    >
                        <TypographyText
                            variant="label"
                            color={typeFilter === filter.value ? Colors.background : Colors.textSecondary}
                        >
                            {filter.label}
                        </TypographyText>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {sortOptions.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.filterChip, sortOption === option.value && styles.activeFilterChip]}
                        onPress={() => setSortOption(option.value)}
                    >
                        <TypographyText
                            variant="label"
                            color={sortOption === option.value ? Colors.background : Colors.textSecondary}
                        >
                            {option.label}
                        </TypographyText>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Inline Add Form */}
                {showForm && (
                    <Card style={styles.formCard}>
                        <TypographyText variant="h3" color={Colors.textPrimary}>
                            {editingWorkout ? 'Editar Treino' : 'Novo Treino'}
                        </TypographyText>

                        <Input
                            label="Nome"
                            placeholder="Ex: Treino A"
                            value={name}
                            onChangeText={setName}
                            style={{ marginTop: Spacing.sm }}
                        />

                        <TypographyText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
                            TIPO
                        </TypographyText>
                        <View style={styles.typeRow}>
                            {(['HIT', 'Calisthenics', 'Weightlifting'] as WorkoutType[]).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeBtn,
                                        type === t && { backgroundColor: typeColors[t], borderColor: typeColors[t] },
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <Text
                                        style={[
                                            Typography.label,
                                            { color: type === t ? Colors.white : Colors.textSecondary },
                                        ]}
                                    >
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Input
                            label="Data/Hora (YYYY-MM-DDTHH:MM)"
                            placeholder="Ex: 2025-01-15T07:00"
                            value={scheduledAt}
                            onChangeText={setScheduledAt}
                            style={{ marginTop: Spacing.sm }}
                        />

                        <TypographyText variant="label" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
                            EXERCÍCIOS
                        </TypographyText>

                        {exercises.map((ex, i) => (
                            <View key={i} style={styles.exerciseCard}>
                                <View style={styles.exerciseHeaderRow}>
                                    <TypographyText variant="label" color={Colors.textSecondary}>
                                        Exercício {i + 1}
                                    </TypographyText>
                                    {exercises.length > 1 && (
                                        <TouchableOpacity onPress={() => removeExerciseRow(i)} style={styles.removeBtn}>
                                            <Text style={{ color: Colors.error, fontSize: 18 }}>×</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TextInput
                                    style={styles.exInputFull}
                                    placeholder="Nome"
                                    placeholderTextColor={Colors.textDisabled}
                                    value={ex.name}
                                    onChangeText={(v) => updateExercise(i, 'name', v)}
                                />

                                <View style={styles.exerciseFieldGrid}>
                                    <TextInput
                                        style={styles.exInputGrid}
                                        placeholder="Séries"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={ex.sets}
                                        onChangeText={(v) => updateExercise(i, 'sets', v)}
                                        keyboardType="number-pad"
                                    />
                                    <TextInput
                                        style={styles.exInputGrid}
                                        placeholder="Reps"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={ex.reps}
                                        onChangeText={(v) => updateExercise(i, 'reps', v)}
                                        keyboardType="number-pad"
                                    />
                                    <TextInput
                                        style={styles.exInputGrid}
                                        placeholder="Kg"
                                        placeholderTextColor={Colors.textDisabled}
                                        value={ex.weight}
                                        onChangeText={(v) => updateExercise(i, 'weight', v)}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addExBtn} onPress={addExerciseRow}>
                            <TypographyText variant="label" color={Colors.primary}>
                                + Exercício
                            </TypographyText>
                        </TouchableOpacity>

                        {formError && (
                            <TypographyText variant="bodySmall" color={Colors.error} style={{ marginTop: Spacing.xs }}>
                                {formError}
                            </TypographyText>
                        )}

                        <Button
                            label={editingWorkout ? 'Salvar Alterações' : 'Salvar Treino'}
                            onPress={handleSave}
                            loading={saving}
                            style={{ marginTop: Spacing.md }}
                        />
                    </Card>
                )}

                {/* Workout List */}
                {workouts.length === 0 && !showForm ? (
                    <EmptyState
                        icon="🏋️"
                        title="Sem treinos"
                        message="Adicione seu primeiro treino para começar."
                        action={{ label: '+ Novo Treino', onPress: openNewForm }}
                    />
                ) : (
                    visibleWorkouts.length === 0 ? (
                        <EmptyState
                            icon="🔎"
                            title="Nenhum treino encontrado"
                            message="Ajuste os filtros para visualizar seus treinos."
                        />
                    ) : visibleWorkouts.map((workout) => (
                        <Card
                            key={workout.id}
                            style={styles.workoutCard}
                            onPress={() => setSelectedWorkout(workout)}
                        >
                            <View style={styles.workoutCardHeader}>
                                <TypographyText variant="h4" color={Colors.textPrimary}>
                                    {workout.name}
                                </TypographyText>
                                <View
                                    style={[
                                        styles.typeBadge,
                                        { backgroundColor: typeColors[workout.type] + '33', borderColor: typeColors[workout.type] },
                                    ]}
                                >
                                    <Text style={[Typography.label, { color: typeColors[workout.type] }]}>
                                        {workout.type}
                                    </Text>
                                </View>
                            </View>
                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                {formatSchedule(workout)}
                            </TypographyText>
                            <TypographyText variant="bodySmall" color={Colors.textDisabled}>
                                {workout.exercises.length} exercícios
                            </TypographyText>
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => openEditForm(workout)}
                                >
                                    <TypographyText variant="label" color={Colors.primary}>
                                        Editar
                                    </TypographyText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.deleteBtn]}
                                    onPress={() => handleDelete(workout)}
                                >
                                    <TypographyText variant="label" color={Colors.error}>
                                        Excluir
                                    </TypographyText>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                )}
            </ScrollView>
            <WorkoutDetailModal
                visible={selectedWorkout !== null}
                workout={selectedWorkout}
                onClose={() => setSelectedWorkout(null)}
                onEdit={openEditForm}
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
    addBtn: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8,
    },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    filterRow: { gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    filterChip: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.full,
        backgroundColor: Colors.surface,
    },
    activeFilterChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, gap: Spacing.sm },
    formCard: { gap: Spacing.xs, marginBottom: Spacing.sm },
    typeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs, flexWrap: 'wrap' },
    typeBtn: {
        flex: 1,
        minWidth: 90,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    exerciseCard: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceElevated,
        gap: Spacing.xs,
    },
    exerciseHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exerciseFieldGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    exInputFull: {
        width: '100%',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: Colors.textPrimary,
        fontSize: 14,
        minHeight: 42,
    },
    exInputGrid: {
        flexBasis: '31%',
        minWidth: 80,
        flexGrow: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: Colors.textPrimary,
        fontSize: 14,
        minHeight: 42,
    },
    removeBtn: { paddingHorizontal: 4 },
    addExBtn: {
        marginTop: Spacing.xs,
        paddingVertical: Spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 6,
        borderStyle: 'dashed',
    },
    workoutCard: { gap: Spacing.xs },
    workoutCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    cardActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    actionBtn: {
        paddingVertical: 4,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 6,
    },
    deleteBtn: {
        borderColor: Colors.error,
    },
});
