import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { WeightRecord } from '../../src/domain/entities/WeightRecord';
import { calculateWeightGoalProgress, selectWeightBaseline, selectWeightGoal, WeightGoal } from '../../src/domain/entities/WeightGoal';
import { Workout } from '../../src/domain/entities/Workout';
import { getItem } from '../../src/adapters/local/LocalStorage';
import { getNextMeal } from '../../src/domain/use-cases/meal/GetNextMeal';
import { getNextScheduledWorkout, getNextWorkout } from '../../src/domain/use-cases/workout/GetNextWorkout';
import { CompositionCard } from '../../src/ui/components/dashboard/CompositionCard';
import { NextMealCard } from '../../src/ui/components/dashboard/NextMealCard';
import { NextWorkoutCard } from '../../src/ui/components/dashboard/NextWorkoutCard';
import { WaterReminder } from '../../src/ui/components/dashboard/WaterReminder';
import { WeightGoalCard } from '../../src/ui/components/dashboard/WeightGoalCard';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { WorkoutDetailModal } from '../../src/ui/components/WorkoutDetailModal';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { isWideLayout } from '../../src/ui/navigation/tabConfig';
import { Colors, Spacing } from '../../src/ui/theme';

const SPLIT_METRICS_MIN_WIDTH = 1024;
const CONTENT_MAX_WIDTH = 1440;

function newestFirst(records: WeightRecord[], hasValue: (record: WeightRecord) => boolean): WeightRecord[] {
    return records.filter(hasValue).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}

export default function DashboardScreen() {
    const { workoutRepo, mealRepo, weightRepo, weightGoalRepo } = useRepositories();
    const { width } = useWindowDimensions();
    const wide = isWideLayout(width);
    const splitMetrics = width >= SPLIT_METRICS_MIN_WIDTH;

    const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
    const [weightGoals, setWeightGoals] = useState<WeightGoal[]>([]);
    const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
    const [fallbackWorkout, setFallbackWorkout] = useState<Workout | null>(null);
    const [nextMeal, setNextMeal] = useState<MealPlanEntry | null>(null);
    const [now, setNow] = useState(() => new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

    const [waterConfirmed, setWaterConfirmed] = useState(false);
    const waterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [waterIntervalMs, setWaterIntervalMs] = useState(60 * 60 * 1000);

    useFocusEffect(useCallback(() => {
        async function load() {
            try {
                setLoading(true);
                const [weights, goals, meals] = await Promise.all([
                    weightRepo.getWeightHistory(),
                    weightGoalRepo.getWeightGoals(),
                    mealRepo.getMealPlanEntries(),
                ]);
                setWeightRecords(weights);
                setWeightGoals(goals);

                const loadedAt = new Date();
                setNow(loadedAt);
                const nw = await getNextWorkout(workoutRepo, loadedAt);
                setNextWorkout(nw);
                setNextMeal(getNextMeal(meals, loadedAt));
                setFallbackWorkout(nw ? null : await getNextScheduledWorkout(workoutRepo, loadedAt));

                const savedInterval = await getItem<number>('water_reminder_interval_ms');
                if (savedInterval && savedInterval > 0) {
                    setWaterIntervalMs(savedInterval);
                }
            } catch (e) {
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []));

    useEffect(() => () => {
        if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
    }, []);

    function handleDrankWater() {
        setWaterConfirmed(true);
        if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
        waterTimerRef.current = setTimeout(() => setWaterConfirmed(false), waterIntervalMs);
    }

    function openNextWorkout() {
        const workout = nextWorkout ?? fallbackWorkout;
        if (workout) setSelectedWorkout(workout);
        else router.push('/workout');
    }

    const weights = newestFirst(weightRecords, (record) => record.weightKg !== null);
    const latestWeight = weights[0] ?? null;
    const previousWeightKg = weights[1]?.weightKg ?? null;
    const latestBodyFat = newestFirst(weightRecords, (record) => record.bodyFatPercentage !== null)[0] ?? null;
    const latestProtein = newestFirst(weightRecords, (record) => record.proteinPercentage !== null)[0] ?? null;
    const activeGoal = selectWeightGoal(weightGoals);
    const baselineWeight = activeGoal ? selectWeightBaseline(weightRecords, activeGoal)?.weightKg ?? null : null;
    const goalProgress = activeGoal
        ? calculateWeightGoalProgress(latestWeight?.weightKg ?? null, activeGoal, baselineWeight)
        : null;

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.content, { paddingHorizontal: wide ? 40 : Spacing.md }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, wide && styles.headerWide]}>
                    <View>
                        <TypographyText variant="title">Visão Geral</TypographyText>
                        <TypographyText variant="bodySmall" color={Colors.outline}>
                            Acompanhamento diário essencial e metas ativas.
                        </TypographyText>
                    </View>
                    <WaterReminder confirmed={waterConfirmed} onConfirm={handleDrankWater} />
                </View>

                {error && (
                    <TypographyText variant="body" color={Colors.error}>
                        {error}
                    </TypographyText>
                )}

                <View testID="dashboard-metrics-row" style={[styles.row, { flexDirection: splitMetrics ? 'row' : 'column' }]}>
                    <WeightGoalCard
                        latestWeight={latestWeight}
                        previousWeightKg={previousWeightKg}
                        goal={activeGoal}
                        progress={goalProgress}
                        style={splitMetrics ? { flex: 7 } : undefined}
                    />
                    <CompositionCard
                        bodyFat={latestBodyFat}
                        protein={latestProtein}
                        onOpenHistory={() => router.push('/history')}
                        style={splitMetrics ? { flex: 5 } : undefined}
                    />
                </View>

                <View testID="dashboard-agenda-row" style={[styles.row, { flexDirection: wide ? 'row' : 'column' }]}>
                    <NextWorkoutCard
                        workout={nextWorkout}
                        fallbackWorkout={fallbackWorkout}
                        now={now}
                        onOpen={openNextWorkout}
                        style={wide ? { flex: 1 } : undefined}
                    />
                    <NextMealCard
                        meal={nextMeal}
                        onOpen={() => router.push('/nutrition')}
                        style={wide ? { flex: 1 } : undefined}
                    />
                </View>
            </ScrollView>
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
    container: { flex: 1 },
    content: {
        paddingVertical: Spacing.lg,
        gap: Spacing.lg,
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        alignSelf: 'center',
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    header: {
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    headerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { gap: Spacing.md },
});
