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
import { parseCsvMealPlan } from '../../src/domain/use-cases/meal/ParseCsvMealPlan';

export default function PlanScreen() {
    const { mealRepo } = useRepositories();
    const [entries, setEntries] = useState<MealPlanEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadEntries();
    }, []);

    async function loadEntries() {
        try {
            setLoading(true);
            const data = await mealRepo.getMealPlanEntries();
            setEntries(data);
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
            await mealRepo.saveMealPlanEntries(parsed);
            await loadEntries();
        } catch {
            setError('Erro ao importar CSV');
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

            {entries.length === 0 ? (
                <EmptyState
                    icon="🍽️"
                    title="Sem plano"
                    message="Importe um arquivo CSV para criar seu plano de refeições."
                    action={{ label: 'Importar CSV', onPress: handleImportCsv }}
                />
            ) : (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {entries.map((entry) => (
                        <Card key={entry.id} style={styles.entryCard}>
                            <View style={styles.entryHeader}>
                                <TypographyText variant="h4" color={Colors.primary}>
                                    {entry.time}
                                </TypographyText>
                                <TypographyText variant="label" color={Colors.textSecondary}>
                                    {entry.day}
                                </TypographyText>
                            </View>
                            <TypographyText variant="h4" color={Colors.textPrimary} style={{ marginTop: Spacing.xs }}>
                                {entry.activity}
                            </TypographyText>
                            <TypographyText variant="body" color={Colors.textSecondary} style={{ marginTop: 2 }}>
                                {entry.description}
                            </TypographyText>
                            <TypographyText
                                variant="bodySmall"
                                color={Colors.textDisabled}
                                style={styles.objective}
                            >
                                {entry.biologicalObjective}
                            </TypographyText>
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
    importBtn: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8,
    },
    importBtnDisabled: { opacity: 0.5 },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    list: { flex: 1 },
    listContent: { padding: Spacing.md, gap: Spacing.sm },
    entryCard: { gap: 2 },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    objective: { marginTop: Spacing.xs, fontStyle: 'italic' },
});
