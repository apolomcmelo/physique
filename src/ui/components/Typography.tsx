import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Typography as TypographyStyles } from '../theme/typography';
import { Colors } from '../theme/colors';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'label' | 'mono';

interface TypographyProps {
    variant?: Variant;
    color?: string;
    style?: TextStyle;
    children: React.ReactNode;
}

export const Typography = ({
    variant = 'body',
    color = Colors.textPrimary,
    style,
    children,
}: TypographyProps) => {
    return (
        <Text style={[TypographyStyles[variant], { color }, style]}>
            {children}
        </Text>
    );
};
