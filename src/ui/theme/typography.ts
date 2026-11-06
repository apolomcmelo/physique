import { StyleSheet } from 'react-native';
import { FontFamily } from './fonts';

export const Typography = StyleSheet.create({
    h1: { fontFamily: FontFamily.bold, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontFamily: FontFamily.bold, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontFamily: FontFamily.semiBold, fontSize: 18, fontWeight: '600' },
    h4: { fontFamily: FontFamily.semiBold, fontSize: 16, fontWeight: '600' },
    body: { fontFamily: FontFamily.regular, fontSize: 14, fontWeight: '400', lineHeight: 22 },
    bodySmall: { fontFamily: FontFamily.regular, fontSize: 12, fontWeight: '400', lineHeight: 18 },
    label: { fontFamily: FontFamily.monoMedium, fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
    mono: { fontFamily: FontFamily.monoMedium, fontSize: 13, fontWeight: '500' },
});
