import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { User } from '../../src/domain/entities/User';
import { WeightRecord } from '../../src/domain/entities/WeightRecord';
import { Workout } from '../../src/domain/entities/Workout';
import { getItem } from '../../src/adapters/local/LocalStorage';
import { getNextMeal } from '../../src/domain/use-cases/meal/GetNextMeal';
import { getNextWorkout } from '../../src/domain/use-cases/workout/GetNextWorkout';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { ProgressBar } from '../../src/ui/components/ProgressBar';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing } from '../../src/ui/theme';

export default function DashboardScreen() {
    const { userRepo, workoutRepo, mealRepo, weightRepo } = useRepositories();

    const [user, setUser] = useState<User | null>(null);
    const [latestWeight, setLatestWeight] = useState<WeightRecord | null>(null);
    const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
    const [nextMeal, setNextMeal] = useState<MealPlanEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [waterPhase, setWaterPhase] = useState<'remind' | 'done'>('remind');
    const waterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [waterIntervalMs, setWaterIntervalMs] = useState(60 * 60 * 1000); // default 1h

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [u, w, meals] = await Promise.all([
                    userRepo.getUser(),
                    weightRepo.getLatestWeight(),
                    mealRepo.getMealPlanEntries(),
                ]);
                setUser(u);
                setLatestWeight(w);

                const now = new Date();
                const [nw, nm] = await Promise.all([
                    getNextWorkout(workoutRepo, now),
                    Promise.resolve(getNextMeal(meals, now)),
                ]);
                setNextWorkout(nw);
                setNextMeal(nm);

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

        return () => {
            if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
        };
    }, []);

    function handleDrankWater() {
        setWaterPhase('done');
        if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
        waterTimerRef.current = setTimeout(() => {
            setWaterPhase('remind');
        }, waterIntervalMs);
    }

    function formatMinutesUntil(date: Date): string {
        const diff = Math.round((date.getTime() - Date.now()) / 60000);
        if (diff < 60) return `Em ${diff} minutos`;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `Em ${h}h${m > 0 ? ` ${m}min` : ''}`;
    }

    function timeToMinutesLocal(time: string): number {
        const [h, m] = time.split(':').map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
    }

    function formatMealTime(time: string): string {
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const mealMin = timeToMinutesLocal(time);
        const diff = mealMin - currentMin;
        if (diff <= 0) return time;
        if (diff < 60) return `Em ${diff} minutos`;
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return `Em ${h}h${m > 0 ? ` ${m}min` : ''}`;
    }

    const currentWeight = latestWeight?.weightKg ?? user?.currentWeight ?? 0;
    const goalWeight = user?.goalWeight ?? 0;
    const profileWeight = user?.currentWeight ?? 0;
    const weightDelta = goalWeight > 0 ? currentWeight - goalWeight : 0;

    // Correct progress for weight loss vs gain
    let progressCurrent = 0;
    let progressGoal = 1;
    if (goalWeight > 0 && profileWeight > 0) {
        if (profileWeight > goalWeight) {
            // weight loss: measure how many kg lost out of total to lose
            progressCurrent = Math.max(0, profileWeight - currentWeight);
            progressGoal = Math.max(0.01, profileWeight - goalWeight);
        } else if (profileWeight < goalWeight) {
            // weight gain: measure how many kg gained out of total to gain
            progressCurrent = Math.max(0, currentWeight - profileWeight);
            progressGoal = Math.max(0.01, goalWeight - profileWeight);
        }
    }

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
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TypographyText variant="h1" color={Colors.textPrimary}>
                        Physique
                    </TypographyText>
                    <TypographyText variant="body" color={Colors.textSecondary}>
                        {user ? `Olá, ${user.name.split(' ')[0]}!` : 'Bem-vindo!'}
                    </TypographyText>
                </View>

                {error && (
                    <TypographyText variant="body" color={Colors.error} style={{ marginBottom: Spacing.md }}>
                        {error}
                    </TypographyText>
                )}

                {/* Weight Card */}
                <Card style={styles.card}>
                    <TypographyText variant="label" color={Colors.textSecondary}>
                        PESO
                    </TypographyText>
                    <View style={styles.weightRow}>
                        <TypographyText variant="h2" color={Colors.textPrimary}>
                            {currentWeight > 0 ? `${currentWeight} kg` : '— kg'}
                        </TypographyText>
                        {goalWeight > 0 && (
                            <TypographyText variant="body" color={Colors.textSecondary}>
                                Objetivo: {goalWeight} kg
                            </TypographyText>
                        )}
                    </View>
                    {weightDelta !== 0 && (
                        <TypographyText variant="bodySmall" color={weightDelta > 0 ? Colors.warning : Colors.success}>
                            {weightDelta > 0 ? '▼' : '▲'} {Math.abs(weightDelta).toFixed(1)} kg para o objetivo
                        </TypographyText>
                    )}
                    {goalWeight > 0 && currentWeight > 0 && (
                        <View style={{ marginTop: Spacing.sm }}>
                            <ProgressBar current={progressCurrent} goal={progressGoal} showPercentage />
                        </View>
                    )}
                </Card>

                {/* Next Workout Card */}
                <Card style={styles.card}>
                    <TypographyText variant="label" color={Colors.textSecondary}>
                        PRÓXIMO TREINO
                    </TypographyText>
                    {nextWorkout ? (
                        <View style={{ marginTop: Spacing.xs }}>
                            <TypographyText variant="h3" color={Colors.textPrimary}>
                                {nextWorkout.name}
                            </TypographyText>
                            {nextWorkout.scheduledAt && (
                                <TypographyText variant="body" color={Colors.primary}>
                                    {formatMinutesUntil(nextWorkout.scheduledAt)} — {nextWorkout.type}
                                </TypographyText>
                            )}
                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                {nextWorkout.exercises.length} exercícios
                            </TypographyText>
                        </View>
                    ) : (
                        <TypographyText variant="body" color={Colors.textDisabled} style={{ marginTop: Spacing.xs }}>
                            Nenhum treino agendado
                        </TypographyText>
                    )}
                </Card>

                {/* Next Meal Card */}
                <Card style={styles.card}>
                    <TypographyText variant="label" color={Colors.textSecondary}>
                        PRÓXIMA REFEIÇÃO
                    </TypographyText>
                    {nextMeal ? (
                        <View style={{ marginTop: Spacing.xs }}>
                            <TypographyText variant="h4" color={Colors.textPrimary}>
                                {nextMeal.activity}
                            </TypographyText>
                            <TypographyText variant="body" color={Colors.primary}>
                                {formatMealTime(nextMeal.time)}
                            </TypographyText>
                            <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                {nextMeal.description}
                            </TypographyText>
                        </View>
                    ) : (
                        <TypographyText variant="body" color={Colors.textDisabled} style={{ marginTop: Spacing.xs }}>
                            Nenhuma refeição agendada para hoje
                        </TypographyText>
                    )}
                </Card>

                {/* Water Reminder Card */}
                <Card style={styles.card}>
                    <TypographyText variant="h4" color={Colors.textPrimary}>
                        💧 {waterPhase === 'remind' ? 'Já bebeu água hoje? 🥺' : 'Excelente 😌'}
                    </TypographyText>
                    {waterPhase === 'remind' && (
                        <Button
                            label="Sim"
                            onPress={handleDrankWater}
                            variant="secondary"
                            style={{ marginTop: Spacing.sm }}
                        />
                    )}
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    container: { flex: 1 },
    content: { padding: Spacing.md, gap: Spacing.md },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    header: { marginBottom: Spacing.sm },
    card: { gap: Spacing.xs },
    weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
});
