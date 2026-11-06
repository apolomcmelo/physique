import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { MealPlanEntry } from '../../../domain/entities/MealPlan';
import { Colors, Spacing } from '../../theme';
import { Card } from '../Card';
import { Typography } from '../Typography';
import { ActionLink } from './ActionLink';
import { AgendaFooter } from './AgendaFooter';
import { DashboardCardHeader } from './DashboardCardHeader';

interface NextMealCardProps {
    meal: MealPlanEntry | null;
    onOpen: () => void;
    style?: ViewStyle;
}

export const NextMealCard = ({ meal, onOpen, style }: NextMealCardProps) => (
    <Card style={{ ...styles.card, ...style }}>
        <DashboardCardHeader icon="restaurant" accent={Colors.secondary} title="Próxima refeição" />
        {meal ? (
            <View style={styles.body}>
                <Typography variant="h3">{meal.activity}</Typography>
                <Typography variant="bodySmall" color={Colors.textSecondary}>{meal.description}</Typography>
            </View>
        ) : (
            <Typography variant="body" color={Colors.textDisabled}>Nenhuma refeição agendada para hoje</Typography>
        )}
        <AgendaFooter
            icon="schedule"
            caption={meal ? `Horário planejado: ${meal.time}` : null}
            action={<ActionLink label="Ir para Nutrição" accent={Colors.secondary} onPress={onOpen} variant="button" />}
        />
    </Card>
);

const styles = StyleSheet.create({
    card: { padding: Spacing.lg, justifyContent: 'space-between', gap: Spacing.md, borderLeftWidth: 2, borderLeftColor: Colors.secondary },
    body: { gap: Spacing.xs },
});
