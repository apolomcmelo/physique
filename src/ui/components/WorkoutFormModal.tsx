import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    ScrollView,
    StyleSheet,
    TextInput,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, Workout, WorkoutType } from '../../domain/entities/Workout';
import { parseLocalizedDecimal } from '../../domain/value-objects/LocalizedDecimal';
import { Button } from './Button';
import { Typography } from './Typography';
import { IconButton } from './IconButton';
import { ExerciseFormCard, ExerciseFormData } from './workout/ExerciseFormCard';
import { FilterChip } from './workout/FilterChip';
import { WORKOUT_TYPE_ACCENT } from './workout/WorkoutCard';
import { WORKOUT_TYPE_LABEL } from '../utils/workoutTypeLabel';
import { Colors, Radius, Spacing, Typography as TypographyTheme } from '../theme';

const WORKOUT_TYPES: WorkoutType[] = ['Weightlifting', 'Calisthenics', 'HIT'];

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

    function duplicateExercise(index: number) {
        setExercises((prev) => {
            const copy = { ...prev[index], id: `temp-${Date.now()}-${Math.random()}` };
            return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
        });
    }

    function adjustSets(index: number, delta: number) {
        setExercises((prev) =>
            prev.map((ex, i) => {
                if (i !== index) return ex;
                const current = parseInt(ex.sets, 10);
                const next = Number.isNaN(current) ? Math.max(delta, 1) : Math.max(current + delta, 1);
                return { ...ex, sets: String(next) };
            }),
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

        const hasInvalidWeight = exercises.some((ex) => {
            if (!ex.name.trim() || !ex.weightKg.trim()) return false;
            const weight = parseLocalizedDecimal(ex.weightKg);
            return weight === null || weight < 0;
        });
        if (hasInvalidWeight) {
            setError('Informe uma carga válida e não negativa; use vírgula ou ponto como separador decimal.');
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
                weightKg: ex.weightKg.trim() ? parseLocalizedDecimal(ex.weightKg) : null,
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
        } catch (cause: unknown) {
            console.error('[workout.form] save failed', {
                operation: isEditing ? 'update' : 'create',
                workoutType: type,
                exerciseCount: builtExercises.length,
                timedExercises: builtExercises
                    .map((exercise, index) => exercise.durationSeconds === null
                        ? null
                        : { exerciseIndex: index, durationSeconds: exercise.durationSeconds })
                    .filter((exercise) => exercise !== null),
                error: cause,
            });
            setError('Erro ao salvar treino');
        }
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    const exerciseCount = exercises.filter((ex) => ex.name.trim()).length;
    const title = isEditing ? `Editar Treino: ${workout?.name}` : 'Novo Treino';
    const saveLabel = isEditing ? 'Salvar Alterações' : 'Criar Treino';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <IconButton
                        icon="arrow-back"
                        onPress={handleClose}
                        size="medium"
                        color={Colors.textSecondary}
                        style={styles.backButton}
                        accessibilityLabel="Voltar"
                    />
                    <View style={styles.headerTitleContainer}>
                        <Typography variant="h3" color={Colors.textPrimary}>
                            {title}
                        </Typography>
                        {isEditing && (
                            <View style={styles.modeBadge}>
                                <Typography variant="labelMono" color={Colors.primary}>
                                    Modo Edição
                                </Typography>
                            </View>
                        )}
                    </View>
                </View>

                {error && (
                    <View style={styles.errorContainer}>
                        <Typography variant="body" color={Colors.error}>
                            {error}
                        </Typography>
                    </View>
                )}

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                >
                    <View style={styles.contentColumn}>
                        <View style={styles.infoPanel}>
                            <Typography variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>
                                Nome do Treino
                            </Typography>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ex: Treino de Peito"
                                placeholderTextColor={Colors.textDisabled}
                                value={name}
                                onChangeText={setName}
                                accessibilityLabel="Nome do Treino"
                            />

                            <Typography variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>
                                Tipo
                            </Typography>
                            <View style={styles.typeButtons}>
                                {WORKOUT_TYPES.map((t) => (
                                    <FilterChip
                                        key={t}
                                        label={WORKOUT_TYPE_LABEL[t]}
                                        active={type === t}
                                        onPress={() => setType(t)}
                                        dotColor={WORKOUT_TYPE_ACCENT[t]}
                                        testID={`form-type-${t}`}
                                    />
                                ))}
                            </View>

                            <Typography variant="label" color={Colors.textSecondary} style={styles.fieldLabel}>
                                Data e Hora (opcional)
                            </Typography>
                            <TextInput
                                style={styles.textInput}
                                placeholder="YYYY-MM-DDTHH:mm"
                                placeholderTextColor={Colors.textDisabled}
                                value={scheduledAt}
                                onChangeText={setScheduledAt}
                                accessibilityLabel="Data e Hora (opcional)"
                            />
                        </View>

                        <View style={styles.listHeader}>
                            <Typography variant="h3" color={Colors.textPrimary}>
                                Ordem e Parâmetros de Execução
                            </Typography>
                            <View style={styles.countPill}>
                                <Typography variant="labelMono" color={Colors.textSecondary} style={styles.countText}>
                                    {`${exerciseCount} ${exerciseCount === 1 ? 'Exercício' : 'Exercícios'}`}
                                </Typography>
                            </View>
                        </View>

                        {exercises.map((exercise, index) => (
                            <ExerciseFormCard
                                key={exercise.id}
                                index={index}
                                total={exercises.length}
                                exercise={exercise}
                                onChange={(field, value) => updateExercise(index, field, value)}
                                onAdjustSets={(delta) => adjustSets(index, delta)}
                                onMoveUp={() => moveExerciseUp(index)}
                                onMoveDown={() => moveExerciseDown(index)}
                                onDuplicate={() => duplicateExercise(index)}
                                onRemove={() => removeExerciseRow(index)}
                            />
                        ))}

                        <Pressable style={styles.addExerciseButton} onPress={addExerciseRow} accessibilityRole="button">
                            <Typography variant="body" color={Colors.primary} style={styles.addExerciseText}>
                                + Adicionar Novo Exercício
                            </Typography>
                        </Pressable>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        label="Cancelar"
                        onPress={handleClose}
                        variant="ghost"
                        style={styles.footerButton}
                    />
                    <Button
                        label={saveLabel}
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
        alignItems: 'center',
        gap: Spacing.sm + 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    backButton: {
        backgroundColor: Colors.surfaceContainer,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        borderRadius: Radius.md,
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    modeBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.3)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    contentColumn: {
        width: '100%',
        maxWidth: 1152,
        alignSelf: 'center',
    },
    errorContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.error,
    },
    infoPanel: {
        backgroundColor: Colors.surfaceLowest,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    fieldLabel: {
        textTransform: 'none',
        letterSpacing: 0,
    },
    textInput: {
        height: 44,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceContainer,
        color: Colors.textPrimary,
        fontSize: 14,
        marginBottom: Spacing.xs,
    },
    typeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm + 4,
        paddingBottom: Spacing.sm + 4,
        marginBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    countPill: {
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: 2,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceElevated,
    },
    countText: {
        textTransform: 'none',
    },
    addExerciseButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.borderSubtle,
        backgroundColor: 'rgba(9, 14, 23, 0.5)',
    },
    addExerciseText: {
        fontFamily: TypographyTheme.h3.fontFamily,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        gap: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    footerButton: {
        flex: 1,
    },
});
