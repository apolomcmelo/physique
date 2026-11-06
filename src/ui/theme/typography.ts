import { StyleSheet } from 'react-native';
import { FontFamily } from './fonts';

export const Typography = StyleSheet.create({
    title: { fontFamily: FontFamily.bold, fontSize: 32, fontWeight: '700', lineHeight: 38, letterSpacing: -0.64 },
    display: { fontFamily: FontFamily.monoBold, fontSize: 48, fontWeight: '700', lineHeight: 52, letterSpacing: -2.4 },
    metricLg: { fontFamily: FontFamily.monoBold, fontSize: 28, fontWeight: '700', lineHeight: 32, letterSpacing: -0.84 },
    metricMd: { fontFamily: FontFamily.monoMedium, fontSize: 20, fontWeight: '600', lineHeight: 24, letterSpacing: -0.4 },
    metricSm: { fontFamily: FontFamily.monoMedium, fontSize: 14, fontWeight: '500', lineHeight: 18 },
    labelMono: { fontFamily: FontFamily.monoMedium, fontSize: 11, fontWeight: '500', lineHeight: 14, letterSpacing: 0.66, textTransform: 'uppercase' },
    h1: { fontFamily: FontFamily.bold, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
    h2: { fontFamily: FontFamily.bold, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    h3: { fontFamily: FontFamily.semiBold, fontSize: 18, fontWeight: '600' },
    h4: { fontFamily: FontFamily.semiBold, fontSize: 16, fontWeight: '600' },
    body: { fontFamily: FontFamily.regular, fontSize: 14, fontWeight: '400', lineHeight: 22 },
    bodySmall: { fontFamily: FontFamily.regular, fontSize: 12, fontWeight: '400', lineHeight: 18 },
    label: { fontFamily: FontFamily.monoMedium, fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
    mono: { fontFamily: FontFamily.monoMedium, fontSize: 13, fontWeight: '500' },
});
