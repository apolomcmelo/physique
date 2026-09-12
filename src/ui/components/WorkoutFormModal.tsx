import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, Workout, WorkoutType } from '../../domain/entities/Workout';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Typography } from './Typography';
import { IconButton } from './IconButton';
import { Colors, Radius, Spacing, Typography as TypographyTheme } from '../theme';

interface ExerciseFormData {
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

interface WorkoutFormModalProps {
    visible: boolean;
    workout?: Workout | null;
    onClose: () => void;
    onSave: (workout: {
        name: string;
        type: WorkoutType;
        scheduledAt: Date | null;
        exercises: Omit<Exercise, 'id'>[];
    }) => Promise<void>;
    loading?: boolean;
}

export const WorkoutFormModal = ({
    visible,
    workout,
    onClose,
    onSave,
    loading = false,
}: WorkoutFormModalProps) => {
    const [name, setName] = React.useState('');
    const [type, setType] = React.useState<WorkoutType>('Calisthenics');
    const [scheduledAt, setScheduledAt] = React.useState('');
    const [exercises, setExercises] = React.useState<ExerciseFormData[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const isEditing = !!workout;

    useEffect(() => {
        if (visible) {
            if (workout) {
                setName(workout.name);
                setType(workout.type);
                setScheduledAt(workout.scheduledAt ? formatDateTimeInput(workout.scheduledAt) : '');
                setExercises(
                    workout.exercises.length > 0
                        ? workout.exercises.map((ex) => ({
                            id: ex.id,
                            name: ex.name,
                            sets: ex.sets !== null ? String(ex.sets) : '',
                            repsPerSet: ex.repsPerSet !== null ? String(ex.repsPerSet) : '',
                            durationSeconds: ex.durationSeconds !== null ? String(ex.durationSeconds) : '',
                            weightKg: ex.weightKg !== null ? String(ex.weightKg) : '',
                            restSecondsBetweenSets: ex.restSecondsBetweenSets !== null ? String(ex.restSecondsBetweenSets) : '',
                            restSecondsBeforeNextExercise: ex.restSecondsBeforeNextExercise !== null ? String(ex.restSecondsBeforeNextExercise) : '',
                            notes: ex.notes || '',
                        }))
                        : [],
                );
            } else {
                resetForm();
            }
            setError(null);
        }
    }, [visible, workout]);

    function formatDateTimeInput(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function resetForm() {
        setName('');
        setType('Calisthenics');
        setScheduledAt('');
        setExercises([createEmptyExercise()]);
        setError(null);
    }

    function createEmptyExercise(): ExerciseFormData {
        return {
            id: `temp-${Date.now()}-${Math.random()}`,
            name: '',
            sets: '',
            repsPerSet: '',
            durationSeconds: '',
            weightKg: '',
            restSecondsBetweenSets: '',
            restSecondsBeforeNextExercise: '',
            notes: '',
        };
    }

    function addExerciseRow() {
        const newExercises = [...exercises, createEmptyExercise()];
        setExercises(newExercises);

        // Auto-scroll to the newly added exercise after a brief delay
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }

    function removeExerciseRow(index: number) {
        setExercises((prev) => prev.filter((_, i) => i !== index));
    }

    function updateExercise(index: number, field: keyof ExerciseFormData, value: string) {
        setExercises((prev) =>
            prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
        );
    }

    function moveExerciseUp(index: number) {
        if (index <= 0) return;
        const newExercises = [...exercises];
        [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
        setExercises(newExercises);
    }

    function moveExerciseDown(index: number) {
        if (index >= exercises.length - 1) return;
        const newExercises = [...exercises];
        [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
        setExercises(newExercises);
    }

    async function handleSave() {
        if (!name.trim()) {
            setError('Nome do treino é obrigatório');
            return;
        }

        if (exercises.length === 0 || exercises.every((ex) => !ex.name.trim())) {
            setError('Adicione pelo menos um exercício');
            return;
        }

        const builtExercises = exercises
            .filter((ex) => ex.name.trim())
            .map((ex, index) => ({
                name: ex.name.trim(),
                orderIndex: index,
                sets: ex.sets ? parseInt(ex.sets, 10) : null,
                repsPerSet: ex.repsPerSet ? parseInt(ex.repsPerSet, 10) : null,
                durationSeconds: ex.durationSeconds ? parseInt(ex.durationSeconds, 10) : null,
                weightKg: ex.weightKg ? parseFloat(ex.weightKg) : null,
                restSecondsBetweenSets: ex.restSecondsBetweenSets ? parseInt(ex.restSecondsBetweenSets, 10) : null,
                restSecondsBeforeNextExercise: ex.restSecondsBeforeNextExercise ? parseInt(ex.restSecondsBeforeNextExercise, 10) : null,
                notes: ex.notes.trim() || null,
            }));

        try {
            setError(null);
            await onSave({
                name: name.trim(),
                type,
                exercises: builtExercises,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            });
            onClose();
        } catch (e) {
            setError('Erro ao salvar treino');
        }
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                        <Typography
                            variant="h2"
                            color={Colors.textPrimary}
                        >
                            {isEditing ? 'Editar Treino' : 'Novo Treino'}
                        </Typography>
                    </View>
                    <IconButton
                        icon="close-outline"
                        onPress={handleClose}
                        size="large"
                        color={Colors.textSecondary}
                        accessibilityLabel="Fechar"
                    />
                </View>

                {/* Error Message */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Typography variant="body" color={Colors.error}>
                            {error}
                        </Typography>
                    </View>
                )}

                {/* Main Form */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                >
                    {/* General Info Section */}
                    <View style={styles.section}>
                        <Typography variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
                            Informações Gerais
                        </Typography>

                        <Input
                            label="Nome do Treino"
                            placeholder="Ex: Treino de Peito"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                        />

                        {/* Type Selector Buttons */}
                        <View style={styles.typeContainer}>
                            <Typography variant="label" color={Colors.textSecondary}>
                                Tipo
                            </Typography>
                            <View style={styles.typeButtons}>
                                {(['Calisthenics', 'HIT', 'Weightlifting'] as WorkoutType[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.typeButton,
                                            type === t && styles.typeButtonActive,
                                        ]}
                                        onPress={() => setType(t)}
                                    >
                                        <Typography
                                            variant="label"
                                            color={type === t ? Colors.white : Colors.textSecondary}
                                        >
                                            {t === 'Calisthenics' ? 'Calistenia' : t === 'HIT' ? 'HIT' : 'Musculação'}
                                        </Typography>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <Input
                            label="Data e Hora (opcional)"
                            placeholder="YYYY-MM-DDTHH:mm"
                            value={scheduledAt}
                            onChangeText={setScheduledAt}
                            style={styles.input}
                        />
                    </View>

                    {/* Exercises Section */}
                    <View style={styles.section}>
                        <Typography variant="label" color={Colors.textSecondary} style={styles.sectionTitle}>
                            Exercícios ({exercises.filter((ex) => ex.name.trim()).length})
                        </Typography>

                        {exercises.map((exercise, index) => (
                            <Card
                                key={exercise.id}
                                style={styles.exerciseCard}
                            >
                                {/* Exercise Header */}
                                <View style={styles.exerciseHeader}>
                                    <View style={styles.exerciseNumberBadge}>
                                        <Typography variant="label" color={Colors.white}>
                                            #{index + 1}
                                        </Typography>
                                    </View>
                                    <View style={styles.exerciseHeaderActions}>
                                        <IconButton
                                            icon="chevron-up"
                                            onPress={() => moveExerciseUp(index)}
                                            disabled={index === 0}
                                            size="small"
                                            color={Colors.primary}
                                            accessibilityLabel={`Mover exercício ${index + 1} para cima`}
                                        />
                                        <IconButton
                                            icon="chevron-down"
                                            onPress={() => moveExerciseDown(index)}
                                            disabled={index === exercises.length - 1}
                                            size="small"
                                            color={Colors.primary}
                                            accessibilityLabel={`Mover exercício ${index + 1} para baixo`}
                                        />
                                        <IconButton
                                            icon="trash-outline"
                                            onPress={() => removeExerciseRow(index)}
                                            size="small"
                                            color={Colors.error}
                                            accessibilityLabel={`Remover exercício ${index + 1}`}
                                        />
                                    </View>
                                </View>

                                {/* Exercise Name */}
                                <Input
                                    label="Nome do Exercício"
                                    placeholder="Ex: Flexões"
                                    value={exercise.name}
                                    onChangeText={(value) => updateExercise(index, 'name', value)}
                                    style={styles.input}
                                />

                                {/* Sets & Reps Row */}
                                <View style={styles.rowContainer}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Séries"
                                            placeholder="Ex: 4"
                                            value={exercise.sets}
                                            onChangeText={(value) => updateExercise(index, 'sets', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Reps"
                                            placeholder="Ex: 10"
                                            value={exercise.repsPerSet}
                                            onChangeText={(value) => updateExercise(index, 'repsPerSet', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                {/* Duration & Weight Row */}
                                <View style={styles.rowContainer}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Duração (s)"
                                            placeholder="Ex: 45"
                                            value={exercise.durationSeconds}
                                            onChangeText={(value) => updateExercise(index, 'durationSeconds', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Peso (kg)"
                                            placeholder="Ex: 4.5"
                                            value={exercise.weightKg}
                                            onChangeText={(value) => updateExercise(index, 'weightKg', value)}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>

                                {/* Rest Between Sets & Rest Before Next Exercise Row */}
                                <View style={styles.rowContainer}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Descanso entre séries (s)"
                                            placeholder="Ex: 15"
                                            value={exercise.restSecondsBetweenSets}
                                            onChangeText={(value) => updateExercise(index, 'restSecondsBetweenSets', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Input
                                            label="Descanso antes do próximo (s)"
                                            placeholder="Ex: 30"
                                            value={exercise.restSecondsBeforeNextExercise}
                                            onChangeText={(value) => updateExercise(index, 'restSecondsBeforeNextExercise', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                {/* Notes */}
                                <Input
                                    label="Observações"
                                    placeholder="Ex: Variação, dicas, etc."
                                    value={exercise.notes}
                                    onChangeText={(value) => updateExercise(index, 'notes', value)}
                                    multiline
                                    style={styles.input}
                                />
                            </Card>
                        ))}

                        {/* Add Exercise Button */}
                        <TouchableOpacity
                            style={styles.addExerciseButton}
                            onPress={addExerciseRow}
                            activeOpacity={0.75}
                        >
                            <IconButton
                                icon="add-outline"
                                onPress={() => { }}
                                size="medium"
                                color={Colors.primary}
                                style={styles.addExerciseIcon}
                            />
                            <Typography variant="body" color={Colors.primary}>
                                Adicionar Exercício
                            </Typography>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <Button
                        label="Cancelar"
                        onPress={handleClose}
                        variant="ghost"
                        style={styles.footerButton}
                    />
                    <Button
                        label={isEditing ? 'Atualizar' : 'Criar Treino'}
                        onPress={handleSave}
                        loading={loading}
                        disabled={loading}
                        style={styles.footerButton}
                    />
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitleContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    errorContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.error,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        marginBottom: Spacing.md,
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        marginBottom: Spacing.md,
    },
    typeContainer: {
        marginBottom: Spacing.md,
    },
    typeButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    typeButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    exerciseCard: {
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    exerciseNumberBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    exerciseHeaderActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    rowContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    halfInput: {
        flex: 1,
    },
    addExerciseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: Colors.transparent,
    },
    addExerciseIcon: {
        width: 24,
        height: 24,
    },
    footer: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    footerButton: {
        flex: 1,
    },
});
