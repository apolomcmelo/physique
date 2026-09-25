import React, { useEffect, useState } from 'react';
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
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { Colors, Spacing } from '../../src/ui/theme';
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { Workout, WorkoutType } from '../../src/domain/entities/Workout';
import { parseCsvMealPlan } from '../../src/domain/use-cases/meal/ParseCsvMealPlan';
import { parseCsvWorkouts } from '../../src/domain/use-cases/workout/ParseCsvWorkouts';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { router } from 'expo-router';
import { savePlanImport } from '../../src/adapters/supabase/SavePlanImport';
import { saveLocalPlanImport } from '../../src/adapters/local/SavePlanImport';

interface TimelineItem {
    id: string;
    day: string;
    time: string;
    activity: string;
    description: string;
    objective: string | null;
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

export default function PlanScreen() {
    const { mealRepo, workoutRepo } = useRepositories();
    const [entries, setEntries] = useState<MealPlanEntry[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dayFilter, setDayFilter] = useState('today');
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

    useEffect(() => {
        loadEntries();
    }, []);

    async function loadEntries() {
        try {
            setLoading(true);
            const [mealEntries, workoutList] = await Promise.all([
                mealRepo.getMealPlanEntries(),
                workoutRepo.getWorkouts(),
            ]);
            setEntries(mealEntries);
            setWorkouts(workoutList);
        } catch {
            setError('Erro ao carregar plano');
        } finally {
            setLoading(false);
        }
    }

    async function handleImportCsv() {
        try {
            setImporting(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) return;

            const uri = result.assets[0].uri;
            let csvContent: string;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                csvContent = await response.text();
            } else {
                csvContent = await FileSystem.readAsStringAsync(uri);
            }

            const parsed = parseCsvMealPlan(csvContent);
            const workouts = parseCsvWorkouts(csvContent);
            if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
                await saveLocalPlanImport(parsed, workouts, csvContent);
            } else {
                await savePlanImport(parsed, workouts, csvContent);
            }

            await loadEntries();
        } catch (err) {
            const detail = err instanceof Error ? err.message : '';
            setError(detail ? `Erro ao importar CSV: ${detail}` : 'Erro ao importar CSV');
        } finally {
            setImporting(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    const timeline = buildTimeline(entries, workouts);
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

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
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
                            onPress={() => {
                                const workout = workouts.find((candidate) => candidate.id === item.id);
                                if (workout) setSelectedWorkout(workout);
                            }}
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
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    objective: { marginTop: Spacing.xs, fontStyle: 'italic' },
});
