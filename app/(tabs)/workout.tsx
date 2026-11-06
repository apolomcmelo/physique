import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    View
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Workout, WorkoutType, createExercise, createWorkout } from '../../src/domain/entities/Workout';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { WorkoutFormModal } from '../../src/ui/components/WorkoutFormModal';
import { AddSessionCard } from '../../src/ui/components/workout/AddSessionCard';
import { FilterChip } from '../../src/ui/components/workout/FilterChip';
import { WORKOUT_TYPE_ACCENT, WorkoutCard } from '../../src/ui/components/workout/WorkoutCard';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { isWideLayout } from '../../src/ui/navigation/tabConfig';
import { confirmAsync } from '../../src/ui/utils/dialogs';
import { matchesSearch } from '../../src/ui/utils/workoutSummary';
import { Colors, Radius, Spacing } from '../../src/ui/theme';

type DayFilter = 'today' | number | 'unscheduled' | 'all';
type SortOption = 'schedule' | 'name' | 'exerciseCount';

const dayFilters: Array<{ label: string; value: DayFilter }> = [
    { label: 'Hoje', value: 'today' },
    { label: 'Todos os Treinos', value: 'all' },
    { label: 'Segunda-feira', value: 1 },
    { label: 'Terça-feira', value: 2 },
    { label: 'Quarta-feira', value: 3 },
    { label: 'Quinta-feira', value: 4 },
    { label: 'Sexta-feira', value: 5 },
    { label: 'Sábado', value: 6 },
    { label: 'Domingo', value: 0 },
    { label: 'Sem agendamento', value: 'unscheduled' },
];

const CONTENT_MAX_WIDTH = 1440;
const GRID_GAP = Spacing.md;

function gridColumns(width: number): number {
    if (width >= 1280) return 3;
    return isWideLayout(width) ? 2 : 1;
}

const typeFilters: Array<{ label: string; value: WorkoutType | 'all' }> = [
    { label: 'Todas Modalidades', value: 'all' },
    { label: 'Calistenia', value: 'Calisthenics' },
    { label: 'HIIT / Condicionamento', value: 'HIT' },
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
    const { width } = useWindowDimensions();
    const wide = isWideLayout(width);
    const columns = gridColumns(width);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [dayFilter, setDayFilter] = useState<DayFilter>('all');
    const [typeFilter, setTypeFilter] = useState<WorkoutType | 'all'>('all');
    const [sortOption, setSortOption] = useState<SortOption>('schedule');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadWorkouts();
    }, []);

    async function loadWorkouts() {
        try {
            setLoading(true);
            const data = await workoutRepo.getWorkouts();
            setWorkouts(sortWorkoutsByScheduledAt(data));
        } catch (cause: unknown) {
            console.error('[workout.list] load failed', { error: cause });
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
        } catch (cause: unknown) {
            console.error('[workout.delete] failed', { workoutId: workout.id, error: cause });
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

    const todayKey = new Date().toDateString();
    const isToday = (workout: Workout) => workout.scheduledAt?.toDateString() === todayKey;

    const visibleWorkouts = sortWorkoutsByScheduledAt(workouts)
        .filter((workout) => {
            if (dayFilter === 'all') return true;
            if (dayFilter === 'unscheduled') return workout.scheduledAt === null;
            if (!workout.scheduledAt) return false;
            if (dayFilter === 'today') return isToday(workout);
            return workout.scheduledAt.getDay() === dayFilter;
        })
        .filter((workout) => typeFilter === 'all' || workout.type === typeFilter)
        .filter((workout) => matchesSearch(workout, search))
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

    const sidePadding = wide ? Spacing.xl + Spacing.sm : Spacing.md;
    const count = visibleWorkouts.length;

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingHorizontal: sidePadding }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.inner}>
                    <View style={[styles.header, wide && styles.headerWide]}>
                        <View style={styles.headerText}>
                            <TypographyText variant="title" color={Colors.textPrimary}>
                                Treinos Planejados & Rotinas
                            </TypographyText>
                            <TypographyText variant="bodySmall" color={Colors.outline}>
                                Gerencie sua grade semanal de treinos, modifique exercícios ou planeje novas sessões.
                            </TypographyText>
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Novo treino"
                            onPress={openNewForm}
                            style={styles.createButton}
                        >
                            <MaterialIcons name="add" size={18} color={Colors.onPrimary} />
                            <TypographyText variant="label" color={Colors.onPrimary} style={styles.noTransform}>
                                Criar Novo Treino
                            </TypographyText>
                        </Pressable>
                    </View>

                    {error && (
                        <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                            {error}
                        </TypographyText>
                    )}

                    <View style={styles.filterPanel}>
                        <View style={styles.filterTop}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                {dayFilters.map((filter) => (
                                    <FilterChip
                                        key={filter.label}
                                        testID={`day-filter-${filter.value}`}
                                        label={filter.label}
                                        active={dayFilter === filter.value}
                                        onPress={() => setDayFilter(filter.value)}
                                    />
                                ))}
                            </ScrollView>
                            <TypographyText variant="labelMono" color={Colors.textSecondary}>
                                {`${count} ${count === 1 ? 'rotina' : 'rotinas'}`}
                            </TypographyText>
                        </View>

                        <View style={[styles.filterBottom, wide && styles.filterBottomWide]}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                {typeFilters.map((filter) => (
                                    <FilterChip
                                        key={filter.label}
                                        testID={`type-filter-${filter.value}`}
                                        label={filter.label}
                                        active={typeFilter === filter.value}
                                        onPress={() => setTypeFilter(filter.value)}
                                        dotColor={filter.value === 'all' ? undefined : WORKOUT_TYPE_ACCENT[filter.value]}
                                    />
                                ))}
                            </ScrollView>
                            <View style={[styles.searchBox, wide && styles.searchBoxWide]}>
                                <MaterialIcons name="search" size={18} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={search}
                                    onChangeText={setSearch}
                                    placeholder="Buscar por treino ou exercício..."
                                    placeholderTextColor={Colors.textDisabled}
                                />
                            </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                            {sortOptions.map((option) => (
                                <FilterChip
                                    key={option.value}
                                    testID={`sort-option-${option.value}`}
                                    label={option.label}
                                    active={sortOption === option.value}
                                    onPress={() => setSortOption(option.value)}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {workouts.length === 0 ? (
                        <EmptyState
                            icon="🏋️"
                            title="Sem treinos"
                            message="Adicione seu primeiro treino para começar."
                            action={{ label: '+ Novo Treino', onPress: openNewForm }}
                        />
                    ) : count === 0 ? (
                        <EmptyState
                            icon="🔎"
                            title="Nenhum treino encontrado"
                            message="Ajuste os filtros para visualizar seus treinos."
                        />
                    ) : (
                        <View style={styles.grid} testID="workout-grid">
                            {visibleWorkouts.map((workout) => (
                                <View
                                    key={workout.id}
                                    testID={`workout-grid-item-${workout.id}`}
                                    style={[styles.gridItem, { width: `${100 / columns}%` as `${number}%` }]}
                                >
                                    <WorkoutCard
                                        workout={workout}
                                        isToday={isToday(workout)}
                                        onOpen={() => setSelectedWorkout(workout)}
                                        onStart={() => router.push(`/workout/active?id=${workout.id}`)}
                                        onEdit={() => openEditForm(workout)}
                                        onDelete={() => handleDelete(workout)}
                                    />
                                </View>
                            ))}
                            <View style={[styles.gridItem, { width: `${100 / columns}%` as `${number}%` }]}>
                                <AddSessionCard onPress={openNewForm} />
                            </View>
                        </View>
                    )}
                </View>
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
    content: { paddingVertical: Spacing.lg },
    inner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', gap: Spacing.lg },
    header: {
        gap: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    headerWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    headerText: { flexShrink: 1, gap: 2 },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryLight,
    },
    noTransform: { textTransform: 'none', letterSpacing: 0, fontWeight: '700' },
    errorText: { marginBottom: Spacing.sm },
    filterPanel: {
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: 'rgba(9, 14, 23, 0.8)',
    },
    filterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    filterBottom: { gap: Spacing.sm },
    filterBottomWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chipRow: { gap: Spacing.xs, alignItems: 'center' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        height: 40,
        paddingHorizontal: Spacing.sm + 4,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceContainer,
    },
    searchBoxWide: { width: 320 },
    searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 13, paddingVertical: 0 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -GRID_GAP / 2 },
    gridItem: { padding: GRID_GAP / 2 },
});
