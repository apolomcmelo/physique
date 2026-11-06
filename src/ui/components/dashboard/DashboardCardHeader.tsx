import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NavIconName } from '../../navigation/tabConfig';
import { Colors, Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface DashboardCardHeaderProps {
    icon: NavIconName;
    accent: string;
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
}

export const DashboardCardHeader = ({ icon, accent, title, subtitle, badge }: DashboardCardHeaderProps) => (
    <View style={styles.row}>
        <View style={styles.titleGroup}>
            <View style={styles.iconBox}>
                <MaterialIcons name={icon} size={18} color={accent} />
            </View>
            <View style={styles.text}>
                <Typography variant="h4" style={styles.title}>{title}</Typography>
                {subtitle ? <Typography variant="bodySmall" color={Colors.outline}>{subtitle}</Typography> : null}
            </View>
        </View>
        {badge}
    </View>
);

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap' },
    titleGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceElevated,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: { flexShrink: 1 },
    title: { fontSize: 14 },
});
