import { StyleSheet } from 'react-native';

export const Typography = StyleSheet.create({
    h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' },
    h4: { fontSize: 16, fontWeight: '600' },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 22 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
    label: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
    mono: { fontSize: 13, fontFamily: 'monospace' },
});
