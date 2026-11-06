import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../theme';

interface ValueStepperProps {
    label: string;
    unit: string;
    value: string;
    keyboardType: 'number-pad' | 'decimal-pad';
    inputLabel: string;
    decreaseLabel: string;
    increaseLabel: string;
    onChangeText: (value: string) => void;
    onStep: (direction: 1 | -1) => void;
}

const ValueStepper = ({ label, unit, value, keyboardType, inputLabel, decreaseLabel, increaseLabel, onChangeText, onStep }: ValueStepperProps) => (
    <View style={styles.tile}>
        <Text style={styles.tileLabel}>{label}</Text>
        <View style={styles.stepperRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={decreaseLabel} onPress={() => onStep(-1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>-</Text>
            </Pressable>
            <View style={styles.valueBox}>
                <TextInput
                    accessibilityLabel={inputLabel}
                    value={value}
                    onChangeText={onChangeText}
                    keyboardType={keyboardType}
                    style={styles.valueInput}
                />
                <Text style={styles.unit}>{unit}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={increaseLabel} onPress={() => onStep(1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
            </Pressable>
        </View>
    </View>
);

interface ActiveSetCardProps {
    setNumber: number;
    totalSets: number;
    target: string;
    reps?: { value: string; onChange: (value: string) => void; onStep: (direction: 1 | -1) => void };
    durationLabel?: string | null;
    weight: { label: string; value: string; onChange: (value: string) => void; onStep: (direction: 1 | -1) => void };
    children?: React.ReactNode;
}

export const ActiveSetCard = ({ setNumber, totalSets, target, reps, durationLabel, weight, children }: ActiveSetCardProps) => (
    <View style={styles.card}>
        <View style={styles.head}>
            <View>
                <View style={styles.live}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Série Ativa</Text>
                </View>
                <View style={styles.setTitle}>
                    <Text style={styles.setNumber}>Série {setNumber}</Text>
                    <Text style={styles.setTotal}>de {totalSets}</Text>
                </View>
            </View>
            <View style={styles.target}>
                <Text style={styles.targetLabel}>META:</Text>
                <Text style={styles.targetValue}>{target}</Text>
            </View>
        </View>
        <View style={styles.tiles}>
            {durationLabel ? (
                <View style={styles.tile}>
                    <Text style={styles.tileLabel}>Duração</Text>
                    <Text style={styles.duration}>{durationLabel}</Text>
                </View>
            ) : null}
            <ValueStepper
                label={weight.label}
                unit="kg"
                value={weight.value}
                keyboardType="decimal-pad"
                inputLabel="Carga realizada em kg"
                decreaseLabel="Diminuir carga"
                increaseLabel="Aumentar carga"
                onChangeText={weight.onChange}
                onStep={weight.onStep}
            />
            {reps ? (
                <ValueStepper
                    label="Repetições Feitas"
                    unit="reps"
                    value={reps.value}
                    keyboardType="number-pad"
                    inputLabel="Repetições realizadas"
                    decreaseLabel="Diminuir repetições"
                    increaseLabel="Aumentar repetições"
                    onChangeText={reps.onChange}
                    onStep={reps.onStep}
                />
            ) : null}
        </View>
        {children}
    </View>
);

const styles = StyleSheet.create({
    card: {
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.4)',
        backgroundColor: Colors.surfaceContainer,
        gap: Spacing.lg,
        shadowColor: Colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
    },
    head: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
    },
    live: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    liveText: { ...Typography.labelMono, color: Colors.primary, fontWeight: '700' },
    setTitle: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: 2 },
    setNumber: { ...Typography.title, color: Colors.textPrimary },
    setTotal: { ...Typography.h3, color: Colors.textDisabled, fontWeight: '400' },
    target: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    targetLabel: { ...Typography.labelMono, color: Colors.textDisabled },
    targetValue: { ...Typography.metricSm, color: Colors.primary, fontWeight: '700' },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    tile: {
        flexGrow: 1,
        flexBasis: 240,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        gap: Spacing.sm,
    },
    tileLabel: { ...Typography.labelMono, color: Colors.textDisabled },
    stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' },
    stepBtn: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceHighest,
    },
    stepText: { ...Typography.metricLg, color: Colors.textPrimary },
    valueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexShrink: 1 },
    valueInput: {
        ...Typography.display,
        minWidth: 96,
        maxWidth: 140,
        textAlign: 'center',
        color: Colors.primary,
        padding: 0,
    },
    unit: { ...Typography.labelMono, color: Colors.textDisabled, textTransform: 'none' },
    duration: { ...Typography.display, color: Colors.textPrimary },
});
