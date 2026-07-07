import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FoodItem } from '../../src/domain/entities/FoodItem';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { EmptyState } from '../../src/ui/components/EmptyState';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing } from '../../src/ui/theme';
import {
    FOOD_IMPORT_ACTION_LABEL,
    FOOD_IMPORT_HINT,
} from '../food/copy';
import { formatMacroLine } from '../food/format';
import { navigateToFoodScan } from '../food/navigation';

export default function NutritionScreen() {
    const { foodRepo } = useRepositories();

    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadFoodItems() {
            try {
                setLoading(true);
                const data = await foodRepo.getFoodItems();
                setFoods(data);
            } catch {
                setError('Erro ao carregar alimentos');
            } finally {
                setLoading(false);
            }
        }

        loadFoodItems();
    }, [foodRepo]);

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
                    Nutrição
                </TypographyText>
                <TouchableOpacity style={styles.importBtn} onPress={navigateToFoodScan}>
                    <TypographyText variant="label" color={Colors.primary}>
                        {FOOD_IMPORT_ACTION_LABEL}
                    </TypographyText>
                </TouchableOpacity>
            </View>

            <TypographyText variant="bodySmall" color={Colors.textSecondary} style={styles.hint}>
                {FOOD_IMPORT_HINT}
            </TypographyText>

            {error && (
                <TypographyText variant="body" color={Colors.error} style={styles.errorText}>
                    {error}
                </TypographyText>
            )}

            {foods.length === 0 ? (
                <EmptyState
                    icon="🥗"
                    title="Sem alimentos cadastrados"
                    message="Importe um rótulo com a câmera ou cadastre manualmente sua tabela nutricional."
                    action={{
                        label: FOOD_IMPORT_ACTION_LABEL,
                        onPress: navigateToFoodScan,
                    }}
                />
            ) : (
                <>
                    <Button
                        label={FOOD_IMPORT_ACTION_LABEL}
                        onPress={navigateToFoodScan}
                        variant="secondary"
                        style={styles.secondaryImportBtn}
                    />

                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {foods.map((item) => (
                            <Card key={item.id} style={styles.foodCard}>
                                <TypographyText variant="h4" color={Colors.textPrimary}>
                                    {item.name}
                                </TypographyText>

                                {item.brandOrSource ? (
                                    <TypographyText variant="bodySmall" color={Colors.textSecondary}>
                                        {item.brandOrSource}
                                    </TypographyText>
                                ) : null}

                                <TypographyText variant="body" color={Colors.textSecondary} style={styles.macroLine}>
                                    {formatMacroLine(item)}
                                </TypographyText>

                                <TypographyText variant="bodySmall" color={Colors.textDisabled}>
                                    Porção: {item.servingSizeGrams} g
                                </TypographyText>

                                {item.ingredients ? (
                                    <TypographyText variant="bodySmall" color={Colors.textSecondary} style={styles.ingredients}>
                                        Ingredientes: {item.ingredients}
                                    </TypographyText>
                                ) : null}
                            </Card>
                        ))}
                    </ScrollView>
                </>
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
    hint: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    errorText: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    secondaryImportBtn: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    list: { flex: 1 },
    listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.sm },
    foodCard: { gap: 4 },
    macroLine: { marginTop: 2 },
    ingredients: { marginTop: 4 },
});
