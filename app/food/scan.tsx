import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
    Image,
    Platform,
    ScrollView,
    Switch,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { recognizeNutritionLabel } from '../../src/adapters/ocr/TesseractOcrAdapter';
import {
    createFoodItem,
    FoodItem,
    FoodNutrient,
    NutritionColumn,
    NutrientCertainty,
    NutrientOrigin,
} from '../../src/domain/entities/FoodItem';
import { generateId } from '../../src/domain/value-objects/UUID';
import { parseLocalizedDecimal } from '../../src/domain/value-objects/LocalizedDecimal';
import { Button } from '../../src/ui/components/Button';
import { Card } from '../../src/ui/components/Card';
import { Input } from '../../src/ui/components/Input';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { Colors, Spacing } from '../../src/ui/theme';
import { alertAsync } from '../../src/ui/utils/dialogs';
import { shouldOpenInAppCamera } from './capture';
import { FOOD_SCAN_RECOGNIZED_TEXT_LABEL, getFoodScanPrimaryActionLabel } from './copy';

interface ColumnDraft {
    id: string;
    label: string;
    basisAmount: string;
    basisUnit: string;
}

interface NutrientValueDraft {
    amount: string;
    unit: string;
    dailyValuePercent: string;
    certainty: NutrientCertainty;
    origin: NutrientOrigin;
}

interface NutrientDraft {
    id: string;
    label: string;
    values: Record<string, NutrientValueDraft>;
}

function emptyColumn(): ColumnDraft {
    return { id: generateId(), label: 'Porção', basisAmount: '', basisUnit: '' };
}

function unknownValueDraft(): NutrientValueDraft {
    return { amount: '', unit: '', dailyValuePercent: '', certainty: 'unknown', origin: 'manual' };
}

function defaultNutrients(columnId: string): NutrientDraft[] {
    const defaults: Array<{ id: string; label: string; unit: string }> = [
        { id: 'energy', label: 'Calorias', unit: 'kcal' },
        { id: 'protein', label: 'Proteínas', unit: 'g' },
        { id: 'carbohydrates', label: 'Carboidratos', unit: 'g' },
        { id: 'total-fat', label: 'Gorduras totais', unit: 'g' },
    ];
    return defaults.map((nutrient) => ({
        id: generateId(),
        label: nutrient.label,
        values: {
            [columnId]: { ...unknownValueDraft(), unit: nutrient.unit },
        },
    }));
}

function columnToDraft(column: NutritionColumn): ColumnDraft {
    return {
        id: column.id,
        label: column.label,
        basisAmount: column.basisAmount === null ? '' : String(column.basisAmount),
        basisUnit: column.basisUnit ?? '',
    };
}

function nutrientToDraft(nutrient: FoodNutrient): NutrientDraft {
    return {
        id: nutrient.id,
        label: nutrient.label,
        values: Object.fromEntries(nutrient.values.map((value) => [value.columnId, {
            amount: value.amount === null ? '' : String(value.amount),
            unit: value.unit ?? '',
            dailyValuePercent: value.dailyValuePercent === null ? '' : String(value.dailyValuePercent),
            certainty: value.certainty,
            origin: value.origin,
        }])),
    };
}

export default function FoodScanScreen() {
    const { foodRepo } = useRepositories();
    const params = useLocalSearchParams<{ id?: string }>();
    const foodItemId = Array.isArray(params.id) ? params.id[0] : params.id;
    const cameraRef = useRef<CameraView>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const [loading, setLoading] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [existingItem, setExistingItem] = useState<FoodItem | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
    const [rawText, setRawText] = useState('');
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [columns, setColumns] = useState<ColumnDraft[]>([emptyColumn()]);
    const [nutrients, setNutrients] = useState<NutrientDraft[]>(() => defaultNutrients(columns[0].id));
    const [ingredients, setIngredients] = useState('');
    const [availableForPlanning, setAvailableForPlanning] = useState(true);
    const [saved, setSaved] = useState(false);

    React.useEffect(() => {
        if (!foodItemId) return;
        let cancelled = false;
        async function loadItem() {
            setLoading(true);
            try {
                const item = await foodRepo.getFoodItemById(foodItemId);
                if (!item) throw new Error('Food item not found');
                if (cancelled) return;
                setExistingItem(item);
                setName(item.name);
                setBrand(item.brandOrSource ?? '');
                setColumns(item.nutritionColumns.map(columnToDraft));
                setNutrients(item.nutrients.map(nutrientToDraft));
                setIngredients(item.ingredients ?? '');
                setRawText(item.rawOcrText ?? '');
                setAvailableForPlanning(item.availableForPlanning);
                if (item.originalImagePath) {
                    const image = await foodRepo.getOriginalImageUrl(item.originalImagePath);
                    if (!cancelled) setOriginalImagePreview(image);
                }
            } catch (cause) {
                if (!cancelled) {
                    await alertAsync('Erro', cause instanceof Error ? cause.message : 'Não foi possível carregar o alimento.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadItem();
        return () => { cancelled = true; };
    }, [foodItemId, foodRepo]);

    async function processImageUri(uri: string) {
        setLoading(true);
        setSaved(false);
        setName('');
        setBrand('');
        setRawText('');
        setIngredients('');
        setColumns([emptyColumn()]);
        setNutrients([]);
        setImageUri(uri);
        setOriginalImagePreview(uri);
        try {
            const result = await recognizeNutritionLabel(uri);
            setRawText(result.rawText);
            setColumns(result.columns.map(columnToDraft));
            setNutrients(result.nutrients.map(nutrientToDraft));
            setIngredients(result.nutritionData.ingredients ?? '');
        } catch {
            await alertAsync('Erro', 'Não foi possível ler o rótulo. Preencha manualmente.');
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
                    await alertAsync('Permissão necessária', 'Permita o acesso à câmera para importar o rótulo.');
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
                await alertAsync('Erro', 'Não foi possível capturar a imagem.');
                return;
            }

            setCameraOpen(false);
            await processImageUri(photo.uri);
        } catch {
            await alertAsync('Erro', 'Não foi possível capturar a imagem.');
        }
    }

    function addColumn() {
        setColumns((current) => [...current, {
            id: generateId(),
            label: `Coluna ${current.length + 1}`,
            basisAmount: '',
            basisUnit: '',
        }]);
    }

    function updateColumn(id: string, field: keyof ColumnDraft, value: string) {
        setColumns((current) => current.map((column) => column.id === id ? { ...column, [field]: value } : column));
    }

    function removeColumn(id: string) {
        if (columns.length <= 1) return;
        setColumns((current) => current.filter((column) => column.id !== id));
        setNutrients((current) => current.map((nutrient) => {
            const values = { ...nutrient.values };
            delete values[id];
            return { ...nutrient, values };
        }));
    }

    function addNutrient() {
        const id = generateId();
        setNutrients((current) => [...current, {
            id,
            label: '',
            values: Object.fromEntries(columns.map((column) => [column.id, unknownValueDraft()])),
        }]);
    }

    function updateNutrientLabel(id: string, label: string) {
        setNutrients((current) => current.map((nutrient) => nutrient.id === id ? { ...nutrient, label } : nutrient));
    }

    function updateNutrientValue(
        nutrientId: string,
        columnId: string,
        field: keyof Omit<NutrientValueDraft, 'certainty' | 'origin'>,
        value: string,
    ) {
        setNutrients((current) => current.map((nutrient) => {
            if (nutrient.id !== nutrientId) return nutrient;
            const existing = nutrient.values[columnId] ?? unknownValueDraft();
            const changedValue = {
                ...existing,
                [field]: value,
                certainty: field === 'amount'
                    ? value.trim() ? 'confirmed' as const : 'unknown' as const
                    : existing.certainty,
                origin: field === 'amount' && value.trim() ? 'manual' as const : existing.origin,
            };
            return { ...nutrient, values: { ...nutrient.values, [columnId]: changedValue } };
        }));
    }

    function setNutrientCertainty(nutrientId: string, columnId: string, certainty: NutrientCertainty) {
        setNutrients((current) => current.map((nutrient) => {
            if (nutrient.id !== nutrientId) return nutrient;
            const existing = nutrient.values[columnId] ?? unknownValueDraft();
            return {
                ...nutrient,
                values: {
                    ...nutrient.values,
                    [columnId]: { ...existing, certainty },
                },
            };
        }));
    }

    function removeNutrient(id: string) {
        setNutrients((current) => current.filter((nutrient) => nutrient.id !== id));
    }

    async function saveFood() {
        if (!name.trim()) {
            await alertAsync('Erro', 'Informe o nome do alimento.');
            return;
        }
        const nutritionColumns: NutritionColumn[] = [];
        for (const column of columns) {
            if (!column.label.trim()) {
                await alertAsync('Base inválida', 'Informe um nome para cada coluna da tabela nutricional.');
                return;
            }
            const basisAmount = column.basisAmount.trim() ? parseLocalizedDecimal(column.basisAmount) : null;
            if (column.basisAmount.trim() && basisAmount === null) {
                await alertAsync('Base inválida', 'Informe uma quantidade válida para cada base nutricional.');
                return;
            }
            if ((basisAmount === null) !== !column.basisUnit.trim()) {
                await alertAsync('Base incompleta', 'Informe quantidade e unidade da base, ou deixe ambas vazias se forem desconhecidas.');
                return;
            }
            nutritionColumns.push({
                id: column.id,
                label: column.label.trim(),
                basisAmount,
                basisUnit: basisAmount === null ? null : column.basisUnit.trim(),
            });
        }

        const parsedNutrients: FoodNutrient[] = [];
        for (const nutrient of nutrients) {
            if (!nutrient.label.trim()) {
                await alertAsync('Nutriente sem nome', 'Informe o nome de cada linha ou remova a linha vazia.');
                return;
            }
            const values = [];
            for (const column of columns) {
                const draft = nutrient.values[column.id] ?? unknownValueDraft();
                const amount = draft.amount.trim() ? parseLocalizedDecimal(draft.amount) : null;
                const dailyValuePercent = draft.dailyValuePercent.trim()
                    ? parseLocalizedDecimal(draft.dailyValuePercent)
                    : null;
                if ((draft.amount.trim() && amount === null)
                    || (draft.dailyValuePercent.trim() && dailyValuePercent === null)) {
                    await alertAsync('Valor inválido', `Revise os valores de ${nutrient.label}; use vírgula ou ponto decimal.`);
                    return;
                }
                if (amount !== null && !draft.unit.trim()) {
                    await alertAsync('Unidade ausente', `Informe a unidade do valor de ${nutrient.label}.`);
                    return;
                }
                values.push({
                    columnId: column.id,
                    amount,
                    unit: draft.unit.trim() || null,
                    dailyValuePercent,
                    certainty: amount === null ? 'unknown' : draft.certainty,
                    origin: draft.origin,
                });
            }
            parsedNutrients.push({ id: nutrient.id, label: nutrient.label.trim(), values });
        }

        setLoading(true);
        try {
            const validated = createFoodItem({
                name: name.trim(),
                brandOrSource: brand.trim() || null,
                nutritionColumns,
                nutrients: parsedNutrients,
                ingredients: ingredients.trim() || null,
                rawOcrText: rawText || null,
                originalImagePath: existingItem?.originalImagePath ?? null,
                availableForPlanning,
            });
            const item = existingItem
                ? { ...validated, id: existingItem.id, createdAt: existingItem.createdAt }
                : validated;
            const savedItem = existingItem
                ? await foodRepo.updateFoodItem(item, imageUri ?? undefined)
                : await foodRepo.saveFoodItem(item, imageUri ?? undefined);
            setExistingItem(savedItem);
            setImageUri(null);
            setSaved(true);
            await alertAsync('Salvo', `${item.name} salvo com sucesso!`);
        } catch (cause) {
            await alertAsync('Erro', cause instanceof Error ? cause.message : 'Não foi possível salvar o alimento.');
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
            <Text style={styles.title}>{existingItem ? 'Corrigir Alimento' : 'Importar Alimento'}</Text>
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

            {originalImagePreview ? (
                <Card style={styles.imageCard}>
                    <Text style={styles.sectionTitle}>Imagem original do rótulo</Text>
                    <Image source={{ uri: originalImagePreview }} style={styles.labelImage} resizeMode="contain" />
                </Card>
            ) : null}

            {rawText ? (
                <Card style={styles.ocrCard}>
                    <Text style={styles.ocrLabel}>{FOOD_SCAN_RECOGNIZED_TEXT_LABEL}</Text>
                    <Text style={styles.ocrText}>
                        {rawText}
                    </Text>
                </Card>
            ) : null}

            <Card style={styles.formCard}>
                <Text style={styles.sectionTitle}>Informações</Text>
                <Input label="Nome do Alimento *" value={name} onChangeText={setName} placeholder="ex: Aveia Quaker" />
                <Input label="Marca / Fonte" value={brand} onChangeText={setBrand} placeholder="ex: Quaker" />
                <View style={styles.switchRow}>
                    <Text style={styles.formLabel}>Disponível para planejamento</Text>
                    <Switch value={availableForPlanning} onValueChange={setAvailableForPlanning} />
                </View>
            </Card>

            <Card style={styles.formCard}>
                <Text style={styles.sectionTitle}>Tabela Nutricional</Text>
                {columns.map((column, index) => (
                    <View key={column.id} style={styles.columnCard}>
                        <Text style={styles.formLabel}>Base {index + 1}</Text>
                        <Input label="Nome da coluna" value={column.label}
                            onChangeText={(value) => updateColumn(column.id, 'label', value)}
                            placeholder="Por porção, por 100 g, por 100 ml..." />
                        <View style={styles.inlineInputs}>
                            <Input label="Quantidade da base" value={column.basisAmount}
                                onChangeText={(value) => updateColumn(column.id, 'basisAmount', value)}
                                keyboardType="decimal-pad" placeholder="Desconhecida" style={styles.inlineInput} />
                            <Input label="Unidade da base" value={column.basisUnit}
                                onChangeText={(value) => updateColumn(column.id, 'basisUnit', value)}
                                placeholder="g, ml..." style={styles.inlineInput} />
                        </View>
                        {columns.length > 1 && (
                            <Button label={`Remover base ${index + 1}`} variant="ghost" onPress={() => removeColumn(column.id)} />
                        )}
                    </View>
                ))}
                <Button label="+ Adicionar coluna/base" variant="secondary" onPress={addColumn} />

                {nutrients.map((nutrient, nutrientIndex) => (
                    <View key={nutrient.id} style={styles.nutrientCard}>
                        <Input label={`Nutriente ${nutrientIndex + 1}`} value={nutrient.label}
                            onChangeText={(value) => updateNutrientLabel(nutrient.id, value)}
                            placeholder="Ex.: Vitamina C, Sódio, Açúcares totais" />
                        {columns.map((column, columnIndex) => {
                            const value = nutrient.values[column.id] ?? unknownValueDraft();
                            return (
                                <View key={column.id} style={styles.nutrientValue}>
                                    <Text style={styles.formLabel}>{column.label}</Text>
                                    <View style={styles.inlineInputs}>
                                        <Input label="Valor" value={value.amount}
                                            onChangeText={(next) => updateNutrientValue(nutrient.id, column.id, 'amount', next)}
                                            keyboardType="decimal-pad" placeholder={`Valor ${nutrientIndex + 1}`}
                                            style={styles.inlineInput} />
                                        <Input label="Unidade" value={value.unit}
                                            onChangeText={(next) => updateNutrientValue(nutrient.id, column.id, 'unit', next)}
                                            placeholder="g, mg, µg, kcal..." style={styles.inlineInput} />
                                        <Input label="% VD" value={value.dailyValuePercent}
                                            onChangeText={(next) => updateNutrientValue(nutrient.id, column.id, 'dailyValuePercent', next)}
                                            keyboardType="decimal-pad" placeholder="% VD"
                                            style={styles.inlineInput} />
                                    </View>
                                    <View style={styles.certaintyRow}>
                                        <Text style={styles.certaintyText}>
                                            {value.certainty === 'uncertain' ? 'Leitura OCR incerta'
                                                : value.certainty === 'unknown' ? 'Valor desconhecido'
                                                    : 'Valor revisado'}
                                        </Text>
                                        {value.certainty !== 'unknown' && (
                                            <Button
                                                label={value.certainty === 'uncertain' ? 'Confirmar' : 'Marcar incerto'}
                                                variant="ghost"
                                                onPress={() => setNutrientCertainty(
                                                    nutrient.id,
                                                    column.id,
                                                    value.certainty === 'uncertain' ? 'confirmed' : 'uncertain',
                                                )}
                                            />
                                        )}
                                        {columnIndex === 0 && value.origin === 'derived' && (
                                            <Text style={styles.certaintyText}>Calculado</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                        <Button label={`Remover ${nutrient.label || 'nutriente'}`} variant="ghost"
                            onPress={() => removeNutrient(nutrient.id)} />
                    </View>
                ))}
                <Button label="+ Adicionar nutriente" variant="secondary" onPress={addNutrient} />
                <Input
                    label="Ingredientes"
                    value={ingredients}
                    onChangeText={setIngredients}
                    multiline
                    placeholder="Farinha de aveia, sal..."
                />
            </Card>

            <Button
                label={saved ? '✓ Salvo!' : existingItem ? 'Salvar Correções' : 'Salvar Alimento'}
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
    imageCard: {
        marginBottom: Spacing.md,
    },
    labelImage: {
        width: '100%',
        height: 220,
        backgroundColor: Colors.surface,
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
    columnCard: {
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    nutrientCard: {
        padding: Spacing.sm,
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    nutrientValue: {
        paddingTop: Spacing.xs,
        marginTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    inlineInputs: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    inlineInput: {
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    formLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    certaintyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    certaintyText: {
        color: Colors.textSecondary,
        fontSize: 12,
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
