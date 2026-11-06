import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardTypeOptions } from 'react-native';
import { Colors, Radius, Spacing, Typography as TypographyTheme } from '../../theme';
import { IconButton } from '../IconButton';
import { Typography } from '../Typography';

export interface ExerciseFormData {
    id: string;
    name: string;
    sets: string;
    repsPerSet: string;
    durationSeconds: string;
    weightKg: string;
    restSecondsBetweenSets: string;
    restSecondsBeforeNextExercise: string;
    notes: string;
}

interface ExerciseFormCardProps {
    index: number;
    total: number;
    exercise: ExerciseFormData;
    onChange: (field: keyof ExerciseFormData, value: string) => void;
    onAdjustSets: (delta: number) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
}

interface FieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (value: string) => void;
    keyboardType: KeyboardTypeOptions;
    unit: string;
    accent?: string;
}

const Field = ({ label, placeholder, value, onChangeText, keyboardType, unit, accent }: FieldProps) => (
    <View style={styles.field}>
        <Typography variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>{label}</Typography>
        <View style={styles.box}>
            <TextInput
                style={[styles.boxInput, accent ? { color: accent } : null]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.textDisabled}
                keyboardType={keyboardType}
                accessibilityLabel={label}
            />
            <Text style={styles.unit}>{unit}</Text>
        </View>
    </View>
);

export const ExerciseFormCard = ({
    index,
    total,
    exercise,
    onChange,
    onAdjustSets,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onRemove,
}: ExerciseFormCardProps) => {
    const position = index + 1;
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.badge}>
                        <Typography variant="metricSm" color={Colors.primary}>
                            {String(position).padStart(2, '0')}
                        </Typography>
                    </View>
                    <TextInput
                        style={styles.nameInput}
                        value={exercise.name}
                        onChangeText={(value) => onChange('name', value)}
                        placeholder="Ex: Flexões"
                        placeholderTextColor={Colors.textDisabled}
                        accessibilityLabel={`Nome do exercício ${position}`}
                    />
                </View>
                <View style={styles.actions}>
                    <IconButton
                        icon="chevron-up"
                        onPress={onMoveUp}
                        disabled={index === 0}
                        size="small"
                        color={Colors.textSecondary}
                        accessibilityLabel={`Mover exercício ${position} para cima`}
                    />
                    <IconButton
                        icon="chevron-down"
                        onPress={onMoveDown}
                        disabled={index === total - 1}
                        size="small"
                        color={Colors.textSecondary}
                        accessibilityLabel={`Mover exercício ${position} para baixo`}
                    />
                    <IconButton
                        icon="copy-outline"
                        onPress={onDuplicate}
                        size="small"
                        color={Colors.textSecondary}
                        accessibilityLabel={`Duplicar exercício ${position}`}
                    />
                    <IconButton
                        icon="trash-outline"
                        onPress={onRemove}
                        size="small"
                        color={Colors.error}
                        accessibilityLabel={`Remover exercício ${position}`}
                    />
                </View>
            </View>

            <View style={styles.grid}>
                <View style={styles.field}>
                    <Typography variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>Séries</Typography>
                    <View style={[styles.box, styles.stepper]}>
                        <Pressable
                            style={styles.stepButton}
                            onPress={() => onAdjustSets(-1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Diminuir séries do exercício ${position}`}
                        >
                            <Text style={styles.stepText}>−</Text>
                        </Pressable>
                        <TextInput
                            style={styles.stepInput}
                            value={exercise.sets}
                            onChangeText={(value) => onChange('sets', value)}
                            placeholder="Ex: 4"
                            placeholderTextColor={Colors.textDisabled}
                            keyboardType="number-pad"
                            accessibilityLabel="Séries"
                        />
                        <Pressable
                            style={styles.stepButton}
                            onPress={() => onAdjustSets(1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Aumentar séries do exercício ${position}`}
                        >
                            <Text style={styles.stepText}>+</Text>
                        </Pressable>
                    </View>
                </View>
                <Field
                    label="Reps"
                    placeholder="Ex: 10"
                    value={exercise.repsPerSet}
                    onChangeText={(value) => onChange('repsPerSet', value)}
                    keyboardType="number-pad"
                    unit="reps"
                />
                <Field
                    label="Carga (kg)"
                    placeholder="Ex: 4.5"
                    value={exercise.weightKg}
                    onChangeText={(value) => onChange('weightKg', value)}
                    keyboardType="decimal-pad"
                    unit="kg"
                />
                <Field
                    label="Duração (s)"
                    placeholder="Ex: 45"
                    value={exercise.durationSeconds}
                    onChangeText={(value) => onChange('durationSeconds', value)}
                    keyboardType="number-pad"
                    unit="seg"
                    accent={Colors.tertiary}
                />
                <Field
                    label="Descanso Séries"
                    placeholder="Ex: 15"
                    value={exercise.restSecondsBetweenSets}
                    onChangeText={(value) => onChange('restSecondsBetweenSets', value)}
                    keyboardType="number-pad"
                    unit="s"
                    accent={Colors.tertiary}
                />
                <Field
                    label="Descanso Pós-Exercício"
                    placeholder="Ex: 30"
                    value={exercise.restSecondsBeforeNextExercise}
                    onChangeText={(value) => onChange('restSecondsBeforeNextExercise', value)}
                    keyboardType="number-pad"
                    unit="s"
                    accent={Colors.secondary}
                />
            </View>

            <TextInput
                style={styles.notes}
                value={exercise.notes}
                onChangeText={(value) => onChange('notes', value)}
                placeholder="Observações: variação, dicas, etc."
                placeholderTextColor={Colors.textDisabled}
                multiline
                accessibilityLabel="Observações"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    badge: {
        width: 32,
        height: 32,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameInput: {
        flex: 1,
        minWidth: 0,
        color: Colors.textPrimary,
        fontFamily: TypographyTheme.h3.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        paddingVertical: Spacing.xs,
    },
    actions: { flexDirection: 'row', alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    field: { flexGrow: 1, flexBasis: 130, minWidth: 130, gap: Spacing.xs },
    fieldLabel: { textTransform: 'none', letterSpacing: 0 },
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: Spacing.sm + 4,
        gap: Spacing.sm,
        backgroundColor: Colors.surfaceContainer,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    boxInput: {
        flex: 1,
        minWidth: 0,
        padding: 0,
        color: Colors.textPrimary,
        fontFamily: TypographyTheme.metricSm.fontFamily,
        fontSize: 14,
        fontWeight: '700',
    },
    unit: {
        color: Colors.textSecondary,
        fontFamily: TypographyTheme.labelMono.fontFamily,
        fontSize: 11,
    },
    stepper: { paddingHorizontal: 4, gap: 0, justifyContent: 'space-between' },
    stepButton: {
        width: 32,
        height: 32,
        borderRadius: Radius.sm,
        backgroundColor: Colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
    stepInput: {
        flex: 1,
        minWidth: 0,
        padding: 0,
        textAlign: 'center',
        color: Colors.textPrimary,
        fontFamily: TypographyTheme.metricMd.fontFamily,
        fontSize: 16,
        fontWeight: '700',
    },
    notes: {
        minHeight: 40,
        backgroundColor: Colors.surfaceContainer,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.sm,
        color: Colors.textPrimary,
        fontSize: 13,
    },
});
