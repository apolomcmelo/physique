import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MealPlanEntry } from '../../src/domain/entities/MealPlan';
import { User } from '../../src/domain/entities/User';
import { WeightRecord } from '../../src/domain/entities/WeightRecord';
import { Workout } from '../../src/domain/entities/Workout';
import { getNextMeal } from '../../src/domain/use-cases/meal/GetNextMeal';
import { recordWeight } from '../../src/domain/use-cases/weight/RecordWeight';
import { getNextWorkout } from '../../src/domain/use-cases/workout/GetNextWorkout';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { ProgressBar } from '../../src/ui/components/ProgressBar';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing, Typography } from '../../src/ui/theme';

export default function DashboardScreen() {
    const { userRepo, workoutRepo, mealRepo, weightRepo } = useRepositories();

    const [user, setUser] = useState<User | null>(null);
    const [latestWeight, setLatestWeight] = useState<WeightRecord | null>(null);
    const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
    const [nextMeal, setNextMeal] = useState<MealPlanEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [drankWater, setDrankWater] = useState(false);
    const [weightInput, setWeightInput] = useState('');
    const [savingWeight, setSavingWeight] = useState(false);

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
            } catch (e) {
                setError('Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleRecordWeight() {
        if (!weightInput) return;
        const kg = parseFloat(weightInput);
        if (isNaN(kg) || kg <= 0) return;
        try {
            setSavingWeight(true);
            const record = await recordWeight(weightRepo, kg, null, null);
            setLatestWeight(record);
            setWeightInput('');
        } finally {
            setSavingWeight(false);
        }
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
    const weightDelta = goalWeight > 0 ? currentWeight - goalWeight : 0;

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
                        <TypographyText variant="bodySmall" color={weightDelta < 0 ? Colors.success : Colors.warning}>
                            {weightDelta < 0 ? '▼' : '▲'} {Math.abs(weightDelta).toFixed(1)} kg para o objetivo
                        </TypographyText>
                    )}
                    {goalWeight > 0 && currentWeight > 0 && (
                        <View style={{ marginTop: Spacing.sm }}>
                            <ProgressBar current={currentWeight} goal={goalWeight} showPercentage />
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
                        💧 Já bebeu água hoje?
                    </TypographyText>
                    <View style={styles.waterRow}>
                        <TouchableOpacity
                            style={[styles.waterBtn, drankWater && styles.waterBtnActive]}
                            onPress={() => setDrankWater(true)}
                        >
                            <Text style={[Typography.h4, { color: drankWater ? Colors.white : Colors.textSecondary }]}>
                                Sim
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.waterBtn, !drankWater && styles.waterBtnInactive]}
                            onPress={() => setDrankWater(false)}
                        >
                            <Text style={[Typography.h4, { color: !drankWater ? Colors.white : Colors.textSecondary }]}>
                                Não
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Quick Weight Record */}
                <Card style={styles.card}>
                    <TypographyText variant="label" color={Colors.textSecondary}>
                        REGISTRAR PESO
                    </TypographyText>
                    <View style={styles.weightInputRow}>
                        <TextInput
                            style={styles.weightInput}
                            value={weightInput}
                            onChangeText={setWeightInput}
                            placeholder="Ex: 75.5"
                            placeholderTextColor={Colors.textDisabled}
                            keyboardType="decimal-pad"
                        />
                        <Button
                            label="Salvar"
                            onPress={handleRecordWeight}
                            loading={savingWeight}
                            disabled={!weightInput}
                            style={styles.weightSaveBtn}
                        />
                    </View>
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
    waterRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    waterBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    waterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    waterBtnInactive: { backgroundColor: Colors.error, borderColor: Colors.error },
    weightInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
    weightInput: {
        flex: 1,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.textPrimary,
        fontSize: 14,
        minHeight: 44,
    },
    weightSaveBtn: { minWidth: 80 },
});
