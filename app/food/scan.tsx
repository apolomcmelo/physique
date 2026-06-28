import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text
} from 'react-native';
import { recognizeNutritionLabel } from '../../src/adapters/ocr/TesseractOcrAdapter';
import { createFoodItem } from '../../src/domain/entities/FoodItem';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Input } from '../../src/ui/components/Input';
import { MacroRow } from '../../src/ui/components/MacroRow';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing } from '../../src/ui/theme';

export default function FoodScanScreen() {
    const { foodRepo } = useRepositories();
    const [loading, setLoading] = useState(false);
    const [rawText, setRawText] = useState('');
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [servingSize, setServingSize] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [saved, setSaved] = useState(false);

    async function scanLabel() {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        setLoading(true);
        setSaved(false);
        try {
            const { rawText: text, nutritionData } = await recognizeNutritionLabel(
                result.assets[0].uri,
            );
            setRawText(text);
            if (nutritionData.calories) setCalories(String(nutritionData.calories));
            if (nutritionData.proteinGrams) setProtein(String(nutritionData.proteinGrams));
            if (nutritionData.carbsGrams) setCarbs(String(nutritionData.carbsGrams));
            if (nutritionData.fatGrams) setFat(String(nutritionData.fatGrams));
            if (nutritionData.servingSizeGrams) setServingSize(String(nutritionData.servingSizeGrams));
            if (nutritionData.ingredients) setIngredients(nutritionData.ingredients);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível ler o rótulo. Preencha manualmente.');
        } finally {
            setLoading(false);
        }
    }

    async function saveFood() {
        if (!name.trim()) {
            Alert.alert('Erro', 'Informe o nome do alimento.');
            return;
        }
        setLoading(true);
        try {
            const item = createFoodItem({
                name: name.trim(),
                brandOrSource: brand.trim() || null,
                servingSizeGrams: parseFloat(servingSize) || 100,
                calories: parseFloat(calories) || 0,
                proteinGrams: parseFloat(protein) || 0,
                carbsGrams: parseFloat(carbs) || 0,
                fatGrams: parseFloat(fat) || 0,
                ingredients: ingredients.trim() || null,
                rawOcrText: rawText || null,
            });
            await foodRepo.saveFoodItem(item);
            setSaved(true);
            Alert.alert('Salvo', `${item.name} salvo com sucesso!`);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível salvar o alimento.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Importar Alimento</Text>
            <Text style={styles.subtitle}>
                Escaneie o rótulo nutricional ou preencha manualmente.
            </Text>

            <Button
                label={loading ? 'Processando OCR...' : '📷 Escanear Rótulo'}
                onPress={scanLabel}
                variant="primary"
                loading={loading}
                style={styles.scanButton}
            />

            {rawText ? (
                <Card style={styles.ocrCard}>
                    <Text style={styles.ocrLabel}>Texto Reconhecido (OCR)</Text>
                    <Text style={styles.ocrText} numberOfLines={6}>
                        {rawText}
                    </Text>
                </Card>
            ) : null}

            <Card style={styles.formCard}>
                <Text style={styles.sectionTitle}>Informações</Text>
                <Input label="Nome do Alimento *" value={name} onChangeText={setName} placeholder="ex: Aveia Quaker" />
                <Input label="Marca / Fonte" value={brand} onChangeText={setBrand} placeholder="ex: Quaker" />
                <Input label="Porção (g)" value={servingSize} onChangeText={setServingSize} keyboardType="numeric" placeholder="100" />
            </Card>

            <Card style={styles.formCard}>
                <Text style={styles.sectionTitle}>Tabela Nutricional</Text>
                <MacroRow label="Calorias" value={calories || '—'} unit="kcal" />
                <Input label="Calorias (kcal)" value={calories} onChangeText={setCalories} keyboardType="numeric" />
                <MacroRow label="Proteínas" value={protein || '—'} unit="g" color={Colors.primary} />
                <Input label="Proteínas (g)" value={protein} onChangeText={setProtein} keyboardType="numeric" />
                <MacroRow label="Carboidratos" value={carbs || '—'} unit="g" color={Colors.warning} />
                <Input label="Carboidratos (g)" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
                <MacroRow label="Gorduras" value={fat || '—'} unit="g" color={Colors.secondary} />
                <Input label="Gorduras (g)" value={fat} onChangeText={setFat} keyboardType="numeric" />
                <Input
                    label="Ingredientes"
                    value={ingredients}
                    onChangeText={setIngredients}
                    multiline
                    placeholder="Farinha de aveia, sal..."
                />
            </Card>

            <Button
                label={saved ? '✓ Salvo!' : 'Salvar Alimento'}
                onPress={saveFood}
                variant={saved ? 'secondary' : 'primary'}
                loading={loading}
                style={styles.saveButton}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    scanButton: {
        marginBottom: Spacing.md,
    },
    ocrCard: {
        marginBottom: Spacing.md,
    },
    ocrLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textDisabled,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.xs,
    },
    ocrText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
    },
    formCard: {
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    saveButton: {
        marginTop: Spacing.sm,
    },
});
