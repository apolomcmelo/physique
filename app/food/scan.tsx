import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { recognizeNutritionLabel } from '../../src/adapters/ocr/TesseractOcrAdapter';
import { createFoodItem } from '../../src/domain/entities/FoodItem';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Input } from '../../src/ui/components/Input';
import { MacroRow } from '../../src/ui/components/MacroRow';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing } from '../../src/ui/theme';
import { shouldOpenInAppCamera } from './capture';
import { FOOD_SCAN_RECOGNIZED_TEXT_LABEL, getFoodScanPrimaryActionLabel } from './copy';

export default function FoodScanScreen() {
    const { foodRepo } = useRepositories();
    const cameraRef = useRef<CameraView>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const [loading, setLoading] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
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

    async function processImageUri(uri: string) {
        setLoading(true);
        setSaved(false);
        try {
            const { rawText: text, nutritionData } = await recognizeNutritionLabel(uri);
            setRawText(text);
            if (nutritionData.calories) setCalories(String(nutritionData.calories));
            if (nutritionData.proteinGrams) setProtein(String(nutritionData.proteinGrams));
            if (nutritionData.carbsGrams) setCarbs(String(nutritionData.carbsGrams));
            if (nutritionData.fatGrams) setFat(String(nutritionData.fatGrams));
            if (nutritionData.servingSizeGrams) setServingSize(String(nutritionData.servingSizeGrams));
            if (nutritionData.ingredients) setIngredients(nutritionData.ingredients);
        } catch {
            Alert.alert('Erro', 'Não foi possível ler o rótulo. Preencha manualmente.');
        } finally {
            setLoading(false);
        }
    }

    async function scanFromPickerCamera() {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;
        await processImageUri(result.assets[0].uri);
    }

    async function openCameraFlow() {
        if (shouldOpenInAppCamera(Platform.OS, globalThis.navigator?.mediaDevices)) {
            if (!cameraPermission?.granted) {
                const permissionResult = await requestCameraPermission();
                if (!permissionResult.granted) {
                    Alert.alert('Permissão necessária', 'Permita o acesso à câmera para importar o rótulo.');
                    return;
                }
            }
            setCameraOpen(true);
            return;
        }

        await scanFromPickerCamera();
    }

    async function captureFromInAppCamera() {
        if (!cameraRef.current) return;
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
            if (!photo?.uri) {
                Alert.alert('Erro', 'Não foi possível capturar a imagem.');
                return;
            }

            setCameraOpen(false);
            await processImageUri(photo.uri);
        } catch {
            Alert.alert('Erro', 'Não foi possível capturar a imagem.');
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

    if (cameraOpen) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
                <View style={styles.cameraControls}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Cancelar captura"
                        style={styles.cameraSecondaryBtn}
                        onPress={() => setCameraOpen(false)}
                    >
                        <Text style={styles.cameraSecondaryBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Capturar rótulo"
                        style={styles.cameraCaptureBtn}
                        onPress={captureFromInAppCamera}
                    >
                        <Text style={styles.cameraCaptureBtnText}>Capturar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Importar Alimento</Text>
            <Text style={styles.subtitle}>
                Escaneie o rótulo nutricional ou preencha manualmente.
            </Text>

            <Button
                label={getFoodScanPrimaryActionLabel(loading)}
                onPress={openCameraFlow}
                variant="primary"
                loading={loading}
                style={styles.scanButton}
            />

            {rawText ? (
                <Card style={styles.ocrCard}>
                    <Text style={styles.ocrLabel}>{FOOD_SCAN_RECOGNIZED_TEXT_LABEL}</Text>
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
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraPreview: {
        flex: 1,
    },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
    },
    cameraSecondaryBtn: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    cameraSecondaryBtnText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    cameraCaptureBtn: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 8,
        backgroundColor: Colors.primary,
    },
    cameraCaptureBtnText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
});
