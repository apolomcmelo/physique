import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavIconName } from '../../navigation/tabConfig';
import { Colors, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface AgendaFooterProps {
    icon: NavIconName;
    caption: string | null;
    action: React.ReactNode;
}

export const AgendaFooter = ({ icon, caption, action }: AgendaFooterProps) => (
    <View style={styles.footer}>
        <View style={styles.meta}>
            {caption !== null && (
                <>
                    <MaterialIcons name={icon} size={14} color={Colors.outline} />
                    <Typography variant="labelMono" color={Colors.outline} style={styles.caption}>{caption}</Typography>
                </>
            )}
        </View>
        {action}
    </View>
);

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 1 },
    caption: { textTransform: 'none' },
});
