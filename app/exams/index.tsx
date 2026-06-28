import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exam, ExamFileType, createExam } from '../../src/domain/entities/Exam';
import { supabase } from '../../src/infrastructure/supabase/client';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Radius, Spacing, Typography } from '../../src/ui/theme';

export default function ExamsScreen() {
    const { examRepo, userRepo } = useRepositories();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadExams();
    }, []);

    async function loadExams() {
        try {
            setLoading(true);
            const data = await examRepo.getExams();
            setExams(data.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()));
        } catch {
            setError('Erro ao carregar exames');
        } finally {
            setLoading(false);
        }
    }

    async function handleUploadExam() {
        try {
            setUploading(true);
            setError(null);

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
                    .upload(storagePath, arrayBuffer, {
                        contentType: asset.mimeType ?? 'application/octet-stream',
                    });

                if (uploadError) throw new Error(uploadError.message);

                const { data: publicData } = supabase.storage.from('exams').getPublicUrl(storagePath);
                fileUrl = publicData.publicUrl;
            }

            const user = await userRepo.getUser();

            const exam = createExam({
                userId: user?.id ?? '',
                title: asset.name ?? `Exame ${new Date().toLocaleDateString('pt-BR')}`,
                fileUrl,
                uploadedAt: new Date(),
                fileType,
            });

            await examRepo.saveExam(exam);
            await loadExams();
        } catch (e) {
            setError('Erro ao enviar exame');
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            await examRepo.deleteExam(id);
            setExams((prev) => prev.filter((e) => e.id !== id));
        } catch {
            setError('Erro ao deletar exame');
        }
    }

    const fileTypeColors: Record<ExamFileType, string> = {
        pdf: Colors.error,
        image: Colors.primary,
    };

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
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={[Typography.label, { color: Colors.textSecondary }]}>← Voltar</Text>
                </TouchableOpacity>
                <TypographyText variant="h2" color={Colors.textPrimary}>
                    Exames
                </TypographyText>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.uploadSection}>
                <Button
                    label="Enviar Exame"
                    onPress={handleUploadExam}
                    loading={uploading}
                />
            </View>

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
            )}

            {exams.length === 0 ? (
                <EmptyState
                    icon="📋"
                    title="Sem exames"
                    message="Envie seus exames médicos para incluí-los na geração do plano."
                    action={{ label: 'Enviar Exame', onPress: handleUploadExam }}
                />
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {exams.map((exam) => (
                        <Card key={exam.id} style={styles.examCard}>
                            <View style={styles.examRow}>
                                <View style={[styles.typeBadge, { backgroundColor: fileTypeColors[exam.fileType] + '22', borderColor: fileTypeColors[exam.fileType] }]}>
                                    <Text style={[Typography.label, { color: fileTypeColors[exam.fileType] }]}>
                                        {exam.fileType.toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.examInfo}>
                                    <TypographyText variant="h4" color={Colors.textPrimary}>
                                        {exam.title}
                                    </TypographyText>
                                    <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                        {exam.uploadedAt.toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </TypographyText>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(exam.id)} style={styles.deleteBtn}>
                                    <Text style={{ color: Colors.error, fontSize: 18 }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))}
                </ScrollView>
            )}
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
    backBtn: { width: 60 },
    uploadSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    list: { flex: 1 },
    listContent: { padding: Spacing.md, gap: Spacing.sm },
    examCard: {},
    examRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    typeBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    examInfo: { flex: 1 },
    deleteBtn: { padding: Spacing.xs },
});
