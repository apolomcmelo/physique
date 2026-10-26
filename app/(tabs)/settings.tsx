import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exam, ExamFileType, createExam } from '../../src/domain/entities/Exam';
import { getDeviceTimezone, isValidTimezone, User, calculateAge } from '../../src/domain/entities/User';
import { WeightRecord } from '../../src/domain/entities/WeightRecord';
import { createWeightGoal, selectWeightGoal, WeightGoal } from '../../src/domain/entities/WeightGoal';
import { recordWeight } from '../../src/domain/use-cases/weight/RecordWeight';
import { parseWeightDateTimeInput } from '../../src/domain/use-cases/weight/WeightRecordInput';
import { parseLocalizedDecimal } from '../../src/domain/value-objects/LocalizedDecimal';
import { generateNewPlanPrompt } from '../../src/domain/use-cases/prompt/GenerateNewPlanPrompt';
import { generateReviewPrompt } from '../../src/domain/use-cases/prompt/GenerateReviewPrompt';
import {
    formatDateOfBirthDisplay,
    formatDateOfBirthInput,
    parseDateOfBirthInput,
} from '../../src/domain/use-cases/user/DateOfBirthInput';
import { saveUserProfile } from '../../src/domain/use-cases/user/SaveUserProfile';
import { supabase } from '../../src/infrastructure/supabase/client';
import { readFileAsArrayBuffer } from '../../src/infrastructure/supabase/readFileAsArrayBuffer';
import { buildExamStoragePath } from '../../src/infrastructure/supabase/storagePaths';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Input } from '../../src/ui/components/Input';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useAuth } from '../../src/ui/hooks/useAuth';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

export default function SettingsScreen() {
    const { userRepo, examRepo, weightRepo, weightGoalRepo, workoutRepo, mealConsumptionRepo, foodRepo } = useRepositories();
    const { session, signOut } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
    const [weightGoals, setWeightGoals] = useState<WeightGoal[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);

    // Profile form fields
    const [name, setName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState(''); // DD/MM/AAAA
    const [height, setHeight] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [goalWeight, setGoalWeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const [protein, setProtein] = useState('');
    const [objective, setObjective] = useState('');
    const [goalStartedAt, setGoalStartedAt] = useState(formatDateOfBirthDisplay(new Date()));
    const [timezone, setTimezone] = useState(getDeviceTimezone());

    // Prompt modal
    const [promptVisible, setPromptVisible] = useState(false);
    const [promptText, setPromptText] = useState('');

    // Exam upload
    const [uploadingExam, setUploadingExam] = useState(false);

    useFocusEffect(useCallback(() => {
        loadData();
    }, []));

    function populateForm(u: User, goals: WeightGoal[] = weightGoals, measurements: WeightRecord[] = weightRecords) {
        const d = u.dateOfBirth instanceof Date ? u.dateOfBirth : new Date(u.dateOfBirth);
        setName(u.name);
        setDateOfBirth(formatDateOfBirthDisplay(d));
        setHeight(String(u.height));
        const currentGoal = selectWeightGoal(goals);
        setCurrentWeight('');
        setGoalWeight(String(currentGoal?.targetWeightKg ?? u.goalWeight));
        setGoalStartedAt(formatDateOfBirthDisplay(currentGoal?.startedAt ?? u.createdAt));
        const latestBodyFat = measurements.filter((record) => record.bodyFatPercentage !== null)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]?.bodyFatPercentage;
        const latestProtein = measurements.filter((record) => record.proteinPercentage !== null)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]?.proteinPercentage;
        setBodyFat(latestBodyFat != null ? String(latestBodyFat) : '');
        setProtein(latestProtein != null ? String(latestProtein) : '');
        setObjective(u.objective);
        setTimezone(u.timezone ?? getDeviceTimezone());
    }

    async function loadData() {
        try {
            setLoading(true);
            const [u, e, measurements, goals] = await Promise.all([
                userRepo.getUser(),
                examRepo.getExams(),
                weightRepo.getWeightHistory(),
                weightGoalRepo.getWeightGoals(),
            ]);
            setExams(e);
            setWeightRecords(measurements);
            setWeightGoals(goals);
            if (u) {
                setUser(u);
                populateForm(u, goals, measurements);
                setEditMode(false);
            } else {
                const googleName = typeof session?.user?.user_metadata?.full_name === 'string'
                    ? session.user.user_metadata.full_name
                    : typeof session?.user?.user_metadata?.name === 'string'
                        ? session.user.user_metadata.name
                        : '';

                if (googleName) {
                    setName(googleName);
                }
                setTimezone(getDeviceTimezone());
                setGoalStartedAt(formatDateOfBirthDisplay(new Date()));
                setEditMode(true);
            }
        } catch {
            setError('Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile() {
        setError(null);
        if (!name.trim() || !dateOfBirth || !height || !goalWeight || !objective.trim()) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }
        const parsedDob = parseDateOfBirthInput(dateOfBirth);
        if (!parsedDob) {
            setError('Data de nascimento inválida (use DD/MM/AAAA e uma data no passado)');
            return;
        }
        const parsedHeight = parseLocalizedDecimal(height);
        const parsedInitialWeight = currentWeight.trim() ? parseLocalizedDecimal(currentWeight) : null;
        const parsedGoalWeight = parseLocalizedDecimal(goalWeight);
        const parsedBodyFat = bodyFat.trim() ? parseLocalizedDecimal(bodyFat) : null;
        const parsedProtein = protein.trim() ? parseLocalizedDecimal(protein) : null;
        if (parsedHeight === null || parsedGoalWeight === null
            || (bodyFat.trim() && parsedBodyFat === null) || (protein.trim() && parsedProtein === null)) {
            setError('Informe números válidos; use vírgula ou ponto como separador decimal.');
            return;
        }
        if (parsedHeight <= 0 || (parsedInitialWeight !== null && parsedInitialWeight <= 0) || parsedGoalWeight <= 0) {
            setError('Altura e pesos devem ser maiores que zero');
            return;
        }
        if ((parsedBodyFat !== null && (parsedBodyFat < 0 || parsedBodyFat > 100))
            || (parsedProtein !== null && (parsedProtein < 0 || parsedProtein > 100))) {
            setError('Percentuais devem estar entre 0 e 100');
            return;
        }
        if (!isValidTimezone(timezone.trim())) {
            setError('Informe um fuso IANA válido, por exemplo America/Sao_Paulo.');
            return;
        }
        const parsedGoalStart = parseWeightDateTimeInput(goalStartedAt, '00:00');
        if (!parsedGoalStart) {
            setError('Data de início da meta inválida (use DD/MM/AAAA).');
            return;
        }
        const latestBodyFat = weightRecords
            .filter((record) => record.bodyFatPercentage !== null)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]?.bodyFatPercentage ?? null;
        const latestProtein = weightRecords
            .filter((record) => record.proteinPercentage !== null)
            .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]?.proteinPercentage ?? null;
        if (user && ((latestBodyFat !== null && !bodyFat.trim()) || (latestProtein !== null && !protein.trim()))) {
            setError('Para remover uma leitura corporal, corrija ou exclua a medição no Histórico.');
            return;
        }
        const bodyFatChanged = parsedBodyFat !== null && parsedBodyFat !== latestBodyFat;
        const proteinChanged = parsedProtein !== null && parsedProtein !== latestProtein;
        try {
            setSaving(true);
            const persistedGoals = await weightGoalRepo.getWeightGoals();
            const activeGoal = selectWeightGoal(persistedGoals);
            const goalChanged = !activeGoal || activeGoal.targetWeightKg !== parsedGoalWeight
                || activeGoal.startedAt.getTime() !== parsedGoalStart.getTime();

            const updated = await saveUserProfile(userRepo, {
                name: name.trim(),
                dateOfBirth: parsedDob,
                height: parsedHeight,
                currentWeight: user?.currentWeight ?? parsedInitialWeight,
                goalWeight: parsedGoalWeight,
                bodyFatPercentage: parsedBodyFat ?? user?.bodyFatPercentage ?? null,
                proteinPercentage: parsedProtein ?? user?.proteinPercentage ?? null,
                objective: objective.trim(),
                timezone: timezone.trim(),
            });
            const ownerId = await userRepo.getCurrentUserId();
            if (!ownerId) throw new Error('É necessário estar logado para salvar medições ou metas.');

            if (!user && (parsedInitialWeight !== null || parsedBodyFat !== null || parsedProtein !== null)) {
                const persistedMeasurements = await weightRepo.getWeightHistory();
                const initialMeasurementExists = persistedMeasurements.some((record) =>
                    record.recordedAt.getTime() === parsedGoalStart.getTime()
                    && record.weightKg === parsedInitialWeight
                    && record.bodyFatPercentage === parsedBodyFat
                    && record.proteinPercentage === parsedProtein);
                if (!initialMeasurementExists) {
                    const initialRecord = await recordWeight(
                        weightRepo,
                        ownerId,
                        parsedInitialWeight,
                        parsedBodyFat,
                        parsedProtein,
                        parsedGoalStart,
                    );
                    setWeightRecords((current) => [initialRecord, ...current]);
                }
            }

            if (!user && goalChanged) {
                const nextGoal = createWeightGoal({
                    userId: ownerId,
                    targetWeightKg: parsedGoalWeight,
                    startedAt: parsedGoalStart,
                });
                await weightGoalRepo.saveWeightGoal(nextGoal);
                setWeightGoals((current) => [...current, nextGoal]);
            }

            if (user && (bodyFatChanged || proteinChanged)) {
                const updatedMeasurement = await recordWeight(
                    weightRepo,
                    ownerId,
                    null,
                    bodyFatChanged ? parsedBodyFat : null,
                    proteinChanged ? parsedProtein : null,
                );
                setWeightRecords((current) => [updatedMeasurement, ...current]);
            }
            if (user && goalChanged) {
                const nextGoal = createWeightGoal({
                    userId: ownerId,
                    targetWeightKg: parsedGoalWeight,
                    startedAt: parsedGoalStart,
                });
                await weightGoalRepo.saveWeightGoal(nextGoal);
                setWeightGoals((current) => [...current, nextGoal]);
            }
            setUser(updated);
            setTimezone(updated.timezone ?? timezone.trim());
            setEditMode(false);
        } catch (cause) {
            console.error('[profile] measurement or goal save failed', { error: cause });
            setError(cause instanceof Error ? cause.message : 'Erro ao salvar perfil, medição ou meta.');
        } finally {
            setSaving(false);
        }
    }

    function handleStartEdit() {
        if (user) populateForm(user);
        setError(null);
        setEditMode(true);
    }

    function handleCancelEdit() {
        if (user) populateForm(user);
        setError(null);
        setEditMode(false);
    }

    async function handleSignOut() {
        try {
            await signOut();
            router.replace('/login' as never);
        } catch {
            setError('Erro ao sair da conta');
        }
    }

    async function handleGenerateNewPlanPrompt() {
        if (!user) return;
        try {
            const [weightRecords, examsList, foodItems] = await Promise.all([
                weightRepo.getWeightHistory(),
                examRepo.getExams(),
                foodRepo.getFoodItems(),
            ]);
            const text = generateNewPlanPrompt(user, weightRecords, examsList, foodItems);
            setPromptText(text);
            setPromptVisible(true);
        } catch {
            setError('Erro ao gerar prompt');
        }
    }

    async function handleGenerateReviewPrompt() {
        if (!user) return;
        try {
            const [weightHistory, sessions, examsList, mealEntries, foodItems] = await Promise.all([
                weightRepo.getWeightHistory(),
                workoutRepo.getWorkoutSessions(),
                examRepo.getExams(),
                mealConsumptionRepo.getMealConsumptions(),
                foodRepo.getFoodItems(),
            ]);
            const text = generateReviewPrompt(user, weightHistory, sessions, examsList, mealEntries, foodItems);
            setPromptText(text);
            setPromptVisible(true);
        } catch {
            setError('Erro ao gerar prompt');
        }
    }

    async function handleUploadExam() {
        try {
            setUploadingExam(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            const authUserId = await userRepo.getCurrentUserId();

            if (!authUserId) {
                throw new Error('User is not authenticated');
            }

            const fileName = asset.name ?? `exam_${Date.now()}`;
            const fileExt = fileName.split('.').pop()?.toLowerCase() ?? 'pdf';
            const fileType: ExamFileType = fileExt === 'pdf' ? 'pdf' : 'image';
            const storagePath = buildExamStoragePath(authUserId, fileName);

            let fileUrl: string;
            if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
                fileUrl = asset.uri;
            } else {
                const arrayBuffer = await readFileAsArrayBuffer(asset.uri);

                const { error: uploadError } = await supabase.storage
                    .from('exams')
                    .upload(storagePath, arrayBuffer, { contentType: asset.mimeType ?? 'application/octet-stream' });

                if (uploadError) throw new Error(uploadError.message);

                fileUrl = storagePath;
            }

            const exam = createExam({
                userId: authUserId,
                title: asset.name ?? `Exame ${new Date().toLocaleDateString('pt-BR')}`,
                fileUrl,
                uploadedAt: new Date(),
                fileType,
            });

            await examRepo.saveExam(exam);
            const updated = await examRepo.getExams();
            setExams(updated);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Erro desconhecido';
            setError(`Erro ao enviar exame: ${message}`);
        } finally {
            setUploadingExam(false);
        }
    }

    async function handleDeleteExam(id: string) {
        try {
            await examRepo.deleteExam(id);
            setExams((prev) => prev.filter((e) => e.id !== id));
        } catch {
            setError('Erro ao deletar exame');
        }
    }

    function handleCopyPrompt() {
        Clipboard.setStringAsync(promptText);
    }

    const latestWeight = [...weightRecords]
        .filter((record) => record.weightKg !== null)
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0] ?? null;
    const currentGoal = selectWeightGoal(weightGoals);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    const dob = user
        ? (user.dateOfBirth instanceof Date ? user.dateOfBirth : new Date(user.dateOfBirth))
        : null;
    const age = dob ? calculateAge(dob) : null;
    const dobFormatted = dob
        ? `${String(dob.getDate()).padStart(2, '0')}/${String(dob.getMonth() + 1).padStart(2, '0')}/${dob.getFullYear()}`
        : '—';

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── PROFILE HEADER ── */}
                <View style={styles.sectionHeader}>
                    <TypographyText variant="h2" color={Colors.textPrimary}>
                        Perfil
                    </TypographyText>
                    {user && !editMode && (
                        <TouchableOpacity onPress={handleStartEdit} style={styles.editBtn} accessibilityLabel="Editar perfil">
                            <Text style={styles.editIcon}>✏️</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {error && (
                    <TypographyText variant="body" color={Colors.error} style={{ marginBottom: Spacing.sm }}>
                        {error}
                    </TypographyText>
                )}

                {/* ── READ-ONLY MODE ── */}
                {user && !editMode && (
                    <Card style={styles.card}>
                        <TypographyText variant="h3" color={Colors.textPrimary}>
                            {user.name}
                        </TypographyText>

                        <View style={styles.infoGrid}>
                            <InfoRow label="Data de Nascimento" value={dobFormatted} />
                            <InfoRow label="Idade" value={age !== null ? `${age} anos` : '—'} />
                            <InfoRow label="Altura" value={`${user.height.toLocaleString('pt-BR')} cm`} />
                            <InfoRow label="Peso Atual" value={latestWeight?.weightKg !== null && latestWeight
                                ? `${latestWeight.weightKg.toLocaleString('pt-BR')} kg (${formatDateOfBirthDisplay(latestWeight.recordedAt)})`
                                : 'Sem medição'} />
                            <InfoRow label="Peso Objetivo" value={currentGoal
                                ? `${currentGoal.targetWeightKg.toLocaleString('pt-BR')} kg`
                                : 'Sem meta'} />
                            {currentGoal && <InfoRow label="Início da meta" value={formatDateOfBirthDisplay(currentGoal.startedAt)} />}
                            {user.timezone && <InfoRow label="Fuso horário" value={user.timezone} />}
                            {weightRecords.some((record) => record.bodyFatPercentage !== null) && (
                                <InfoRow label="Gordura" value={`${weightRecords
                                    .filter((record) => record.bodyFatPercentage !== null)
                                    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0].bodyFatPercentage!.toLocaleString('pt-BR')}%`} />
                            )}
                            {weightRecords.some((record) => record.proteinPercentage !== null) && (
                                <InfoRow label="Proteína" value={`${weightRecords
                                    .filter((record) => record.proteinPercentage !== null)
                                    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0].proteinPercentage!.toLocaleString('pt-BR')}%`} />
                            )}
                        </View>

                        <View style={styles.objectiveBlock}>
                            <TypographyText variant="label" color={Colors.textSecondary}>
                                OBJETIVO
                            </TypographyText>
                            <TypographyText variant="body" color={Colors.textPrimary} style={{ marginTop: 2 }}>
                                {user.objective}
                            </TypographyText>
                        </View>
                    </Card>
                )}

                {/* ── EDIT / CREATE FORM ── */}
                {(!user || editMode) && (
                    <Card style={styles.card}>
                        <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} />
                        <View style={styles.row}>
                            <Input
                                label="Data de Nascimento"
                                placeholder="DD/MM/AAAA"
                                value={dateOfBirth}
                                onChangeText={(value) => setDateOfBirth(formatDateOfBirthInput(value))}
                                keyboardType="number-pad"
                                style={styles.halfInput}
                            />
                            <Input
                                label="Altura (cm)"
                                placeholder="175"
                                value={height}
                                onChangeText={setHeight}
                                keyboardType="decimal-pad"
                                style={styles.halfInput}
                            />
                        </View>
                        <TypographyText variant="bodySmall" color={Colors.textSecondary} style={styles.inputHint}>
                            Digite apenas os numeros. O app formata automaticamente como DD/MM/AAAA.
                        </TypographyText>
                        {!user && <Input
                            label="Peso inicial (kg)"
                            placeholder="75"
                            value={currentWeight}
                            onChangeText={setCurrentWeight}
                            keyboardType="decimal-pad"
                        />}
                        <View style={styles.row}>
                            <Input
                                label="Peso Objetivo (kg)"
                                placeholder="70"
                                value={goalWeight}
                                onChangeText={setGoalWeight}
                                keyboardType="decimal-pad"
                                style={styles.halfInput}
                            />
                        </View>
                        <Input label="Início da meta" placeholder="DD/MM/AAAA" value={goalStartedAt}
                            onChangeText={setGoalStartedAt} />
                        <View style={styles.row}>
                            <Input
                                label="Gordura (%)"
                                placeholder="20"
                                value={bodyFat}
                                onChangeText={setBodyFat}
                                keyboardType="decimal-pad"
                                style={styles.halfInput}
                            />
                            <Input
                                label="Proteína (%)"
                                placeholder="22"
                                value={protein}
                                onChangeText={setProtein}
                                keyboardType="decimal-pad"
                                style={styles.halfInput}
                            />
                        </View>
                        <Input
                            label="Objetivo"
                            placeholder="Ex: Perder gordura e ganhar massa"
                            value={objective}
                            onChangeText={setObjective}
                            multiline
                        />
                        <Input label="Fuso horário (IANA)" placeholder="America/Sao_Paulo" value={timezone}
                            onChangeText={setTimezone} autoCapitalize="none" />
                        <TypographyText variant="bodySmall" color={Colors.textSecondary} style={styles.inputHint}>
                            O fuso é salvo no perfil. O uso nos cálculos da agenda depende das regras de horário de verão ainda em definição.
                        </TypographyText>
                        <View style={[styles.row, { marginTop: Spacing.sm }]}>
                            {editMode && user && (
                                <Button
                                    label="Cancelar"
                                    onPress={handleCancelEdit}
                                    variant="secondary"
                                    style={{ flex: 1 }}
                                />
                            )}
                            <Button
                                label="Salvar Perfil"
                                onPress={handleSaveProfile}
                                loading={saving}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Card>
                )}

                {/* ── ACCOUNT ── */}
                {session && (
                    <Card style={styles.card}>
                        <Button
                            label="Sair da conta"
                            onPress={handleSignOut}
                            variant="secondary"
                        />
                    </Card>
                )}

                {/* ── PROMPTS ── */}
                {user && (
                    <>
                        <TypographyText variant="h3" color={Colors.textPrimary} style={styles.sectionTitle}>
                            Gerar Prompts
                        </TypographyText>
                        <Card style={styles.card}>
                            <Button
                                label="Gerar Prompt (Novo Plano)"
                                onPress={handleGenerateNewPlanPrompt}
                                style={{ marginBottom: Spacing.sm }}
                            />
                            <Button
                                label="Gerar Prompt (Revisão)"
                                onPress={handleGenerateReviewPrompt}
                                variant="secondary"
                            />
                        </Card>
                    </>
                )}

                {/* ── EXAMS ── */}
                <TypographyText variant="h3" color={Colors.textPrimary} style={styles.sectionTitle}>
                    Exames
                </TypographyText>
                <Card style={styles.card}>
                    <Button
                        label="Enviar Exame"
                        onPress={handleUploadExam}
                        loading={uploadingExam}
                        style={{ marginBottom: Spacing.sm }}
                    />
                    {exams.length === 0 ? (
                        <TypographyText variant="body" color={Colors.textDisabled}>
                            Nenhum exame enviado
                        </TypographyText>
                    ) : (
                        exams.map((exam) => (
                            <View key={exam.id} style={styles.examRow}>
                                <View style={{ flex: 1 }}>
                                    <TypographyText variant="h4" color={Colors.textPrimary}>
                                        {exam.title}
                                    </TypographyText>
                                    <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                        {exam.fileType.toUpperCase()} • {exam.uploadedAt.toLocaleDateString('pt-BR')}
                                    </TypographyText>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteExam(exam.id)} style={styles.deleteBtn}>
                                    <Text style={{ color: Colors.error, fontSize: 16 }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </Card>

                {/* ── BODY PHOTOS ── */}
                <TypographyText variant="h3" color={Colors.textPrimary} style={styles.sectionTitle}>
                    Fotos Corporais
                </TypographyText>
                <Card style={styles.card}>
                    <Button
                        label="Abrir Câmera"
                        onPress={() => router.push('/camera')}
                        variant="ghost"
                    />
                </Card>
            </ScrollView>

            {/* ── PROMPT MODAL ── */}
            <Modal
                visible={promptVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setPromptVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TypographyText variant="h3" color={Colors.textPrimary}>
                            Prompt Gerado
                        </TypographyText>
                        <TouchableOpacity onPress={() => setPromptVisible(false)}>
                            <Text style={[Typography.h4, { color: Colors.textSecondary }]}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.promptScroll} showsVerticalScrollIndicator={false}>
                        <Text style={[Typography.mono, styles.promptText]}>{promptText}</Text>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <Button label="Copiar" onPress={handleCopyPrompt} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ── Helper component ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={infoRowStyles.container}>
            <TypographyText variant="label" color={Colors.textSecondary} style={infoRowStyles.label}>
                {label}
            </TypographyText>
            <TypographyText variant="body" color={Colors.textPrimary} style={infoRowStyles.value}>
                {value}
            </TypographyText>
        </View>
    );
}

const infoRowStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    label: { flex: 1 },
    value: { flex: 1, textAlign: 'right' },
});

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    scroll: { flex: 1 },
    content: { padding: Spacing.md, gap: Spacing.sm },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    sectionTitle: { marginTop: Spacing.sm, marginBottom: Spacing.xs },
    editBtn: { padding: Spacing.xs },
    editIcon: { fontSize: 20 },
    card: { gap: Spacing.sm },
    infoGrid: { gap: 0 },
    objectiveBlock: { paddingTop: Spacing.sm },
    row: { flexDirection: 'row', gap: Spacing.sm },
    halfInput: { flex: 1 },
    inputHint: { marginTop: -Spacing.xs },
    examRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    deleteBtn: { padding: Spacing.xs },
    modalContainer: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    promptScroll: { flex: 1 },
    promptText: {
        color: Colors.textSecondary,
        lineHeight: 20,
        padding: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
    },
    modalFooter: { paddingTop: Spacing.md },
});
