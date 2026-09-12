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
import { IconButton } from '../../src/ui/components/IconButton';
import { Input } from '../../src/ui/components/Input';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { WorkoutFormModal } from '../../src/ui/components/WorkoutFormModal';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { confirmAsync } from '../../src/ui/utils/dialogs';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

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
    const [saving, setSaving] = useState(false);

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

    function openNewForm() {
        setShowForm(true);
    }

    function openEditForm(workout: Workout) {
        setEditingWorkout(workout);
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

    async function handleSaveWorkout(data: {
        name: string;
        type: WorkoutType;
        scheduledAt: Date | null;
        exercises: Omit<any, 'id'>[];
    }) {
        try {
            setSaving(true);
            if (editingWorkout) {
                const builtExercises = data.exercises.map((ex, index) =>
                    createExercise({
                        name: ex.name,
                        orderIndex: index,
                        sets: ex.sets,
                        repsPerSet: ex.repsPerSet,
                        weightKg: ex.weightKg,
                        durationSeconds: ex.durationSeconds,
                        restSecondsBetweenSets: ex.restSecondsBetweenSets,
                        restSecondsBeforeNextExercise: ex.restSecondsBeforeNextExercise,
                        notes: ex.notes,
                    }),
                );
                await workoutRepo.updateWorkout({
                    ...editingWorkout,
                    name: data.name,
                    type: data.type,
                    exercises: builtExercises,
                    scheduledAt: data.scheduledAt,
                });
            } else {
                const builtExercises = data.exercises.map((ex, index) =>
                    createExercise({
                        name: ex.name,
                        orderIndex: index,
                        sets: ex.sets,
                        repsPerSet: ex.repsPerSet,
                        weightKg: ex.weightKg,
                        durationSeconds: ex.durationSeconds,
                        restSecondsBetweenSets: ex.restSecondsBetweenSets,
                        restSecondsBeforeNextExercise: ex.restSecondsBeforeNextExercise,
                        notes: ex.notes,
                    }),
                );
                const workout = createWorkout({
                    name: data.name,
                    type: data.type,
                    exercises: builtExercises,
                    scheduledAt: data.scheduledAt,
                });
                await workoutRepo.saveWorkout(workout);
            }
            await loadWorkouts();
            setShowForm(false);
            setEditingWorkout(null);
        } catch (e) {
            throw e;
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
                <IconButton
                    icon="add-outline"
                    onPress={openNewForm}
                    size="large"
                    color={Colors.primary}
                    accessibilityLabel="Novo treino"
                />
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
                {/* Workout List */}
                {workouts.length === 0 ? (
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
                                <IconButton
                                    icon="pencil-outline"
                                    onPress={() => openEditForm(workout)}
                                    size="medium"
                                    color={Colors.primary}
                                    accessibilityLabel={`Editar ${workout.name}`}
                                />
                                <IconButton
                                    icon="trash-outline"
                                    onPress={() => handleDelete(workout)}
                                    size="medium"
                                    color={Colors.error}
                                    accessibilityLabel={`Excluir ${workout.name}`}
                                />
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
            <WorkoutFormModal
                visible={showForm}
                workout={editingWorkout}
                onClose={() => {
                    setShowForm(false);
                    setEditingWorkout(null);
                }}
                onSave={handleSaveWorkout}
                loading={saving}
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
});
