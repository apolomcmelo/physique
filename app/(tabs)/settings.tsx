import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Clipboard,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exam, ExamFileType, createExam } from '../../src/domain/entities/Exam';
import { User } from '../../src/domain/entities/User';
import { generateNewPlanPrompt } from '../../src/domain/use-cases/prompt/GenerateNewPlanPrompt';
import { generateReviewPrompt } from '../../src/domain/use-cases/prompt/GenerateReviewPrompt';
import { saveUserProfile } from '../../src/domain/use-cases/user/SaveUserProfile';
import { supabase } from '../../src/infrastructure/supabase/client';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Input } from '../../src/ui/components/Input';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

export default function SettingsScreen() {
    const { userRepo, examRepo, weightRepo, workoutRepo, mealRepo, foodRepo } = useRepositories();

    const [user, setUser] = useState<User | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Profile form
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [goalWeight, setGoalWeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const [protein, setProtein] = useState('');
    const [objective, setObjective] = useState('');

    // Prompt modal
    const [promptVisible, setPromptVisible] = useState(false);
    const [promptText, setPromptText] = useState('');

    // Exam upload
    const [uploadingExam, setUploadingExam] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [u, e] = await Promise.all([userRepo.getUser(), examRepo.getExams()]);
            setExams(e);
            if (u) {
                setUser(u);
                setName(u.name);
                setAge(String(u.age));
                setHeight(String(u.height));
                setCurrentWeight(String(u.currentWeight));
                setGoalWeight(String(u.goalWeight));
                setBodyFat(u.bodyFatPercentage !== null ? String(u.bodyFatPercentage) : '');
                setProtein(u.proteinPercentage !== null ? String(u.proteinPercentage) : '');
                setObjective(u.objective);
            }
        } catch {
            setError('Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile() {
        if (!name.trim() || !age || !height || !currentWeight || !goalWeight || !objective.trim()) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            const updated = await saveUserProfile(userRepo, {
                name: name.trim(),
                age: parseInt(age, 10),
                height: parseFloat(height),
                currentWeight: parseFloat(currentWeight),
                goalWeight: parseFloat(goalWeight),
                bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : null,
                proteinPercentage: protein ? parseFloat(protein) : null,
                objective: objective.trim(),
            });
            setUser(updated);
        } catch (e) {
            setError('Erro ao salvar perfil');
        } finally {
            setSaving(false);
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
                mealRepo.getMealPlanEntries(),
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
            const fileName = asset.name ?? `exam_${Date.now()}`;
            const fileExt = fileName.split('.').pop()?.toLowerCase() ?? 'pdf';
            const fileType: ExamFileType = fileExt === 'pdf' ? 'pdf' : 'image';
            const storagePath = `exams/${Date.now()}_${fileName}`;

            let fileUrl: string;
            if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
                fileUrl = asset.uri;
            } else {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                const { error: uploadError } = await supabase.storage
                    .from('exams')
                    .upload(storagePath, arrayBuffer, { contentType: asset.mimeType ?? 'application/octet-stream' });

                if (uploadError) throw new Error(uploadError.message);

                const { data: publicData } = supabase.storage.from('exams').getPublicUrl(storagePath);
                fileUrl = publicData.publicUrl;
            }

            const exam = createExam({
                userId: user?.id ?? '',
                title: asset.name ?? `Exame ${new Date().toLocaleDateString('pt-BR')}`,
                fileUrl,
                uploadedAt: new Date(),
                fileType,
            });

            await examRepo.saveExam(exam);
            const updated = await examRepo.getExams();
            setExams(updated);
        } catch {
            setError('Erro ao enviar exame');
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
        Clipboard.setString(promptText);
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
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <TypographyText variant="h2" color={Colors.textPrimary} style={styles.sectionTitle}>
                    Perfil
                </TypographyText>

                {error && (
                    <TypographyText variant="body" color={Colors.error} style={{ marginBottom: Spacing.sm }}>
                        {error}
                    </TypographyText>
                )}

                {/* Profile Form */}
                <Card style={styles.card}>
                    <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} />
                    <View style={styles.row}>
                        <Input
                            label="Idade"
                            placeholder="25"
                            value={age}
                            onChangeText={setAge}
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
                    <View style={styles.row}>
                        <Input
                            label="Peso Atual (kg)"
                            placeholder="75"
                            value={currentWeight}
                            onChangeText={setCurrentWeight}
                            keyboardType="decimal-pad"
                            style={styles.halfInput}
                        />
                        <Input
                            label="Peso Objetivo (kg)"
                            placeholder="70"
                            value={goalWeight}
                            onChangeText={setGoalWeight}
                            keyboardType="decimal-pad"
                            style={styles.halfInput}
                        />
                    </View>
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
                    <Button
                        label="Salvar Perfil"
                        onPress={handleSaveProfile}
                        loading={saving}
                        style={{ marginTop: Spacing.sm }}
                    />
                </Card>

                {/* Prompts */}
                <TypographyText variant="h3" color={Colors.textPrimary} style={styles.sectionTitle}>
                    Gerar Prompts
                </TypographyText>
                <Card style={styles.card}>
                    <Button
                        label="Gerar Prompt (Novo Plano)"
                        onPress={handleGenerateNewPlanPrompt}
                        disabled={!user}
                        style={{ marginBottom: Spacing.sm }}
                    />
                    <Button
                        label="Gerar Prompt (Revisão)"
                        onPress={handleGenerateReviewPrompt}
                        variant="secondary"
                        disabled={!user}
                    />
                </Card>

                {/* Exams */}
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

                {/* Body Photos */}
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

            {/* Prompt Modal */}
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

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
    scroll: { flex: 1 },
    content: { padding: Spacing.md, gap: Spacing.sm },
    sectionTitle: { marginTop: Spacing.sm, marginBottom: Spacing.xs },
    card: { gap: Spacing.sm },
    row: { flexDirection: 'row', gap: Spacing.sm },
    halfInput: { flex: 1 },
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
