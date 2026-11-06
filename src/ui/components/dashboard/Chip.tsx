import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '../../theme';
import { Typography } from '../Typography';

interface ChipProps {
    label: string;
    accent: string;
}

export const Chip = ({ label, accent }: ChipProps) => (
    <View style={[styles.chip, { backgroundColor: `${accent}1A`, borderColor: `${accent}4D` }]}>
        <Typography variant="labelMono" color={accent} style={styles.text}>{label}</Typography>
    </View>
);

const styles = StyleSheet.create({
    chip: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    text: { textTransform: 'none' },
});
