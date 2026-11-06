import {
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

export const FontFamily = {
    regular: 'Geist_400Regular',
    medium: 'Geist_500Medium',
    semiBold: 'Geist_600SemiBold',
    bold: 'Geist_700Bold',
    monoMedium: 'JetBrainsMono_500Medium',
    monoBold: 'JetBrainsMono_700Bold',
} as const;

export const FONT_ASSETS = {
    [FontFamily.regular]: Geist_400Regular,
    [FontFamily.medium]: Geist_500Medium,
    [FontFamily.semiBold]: Geist_600SemiBold,
    [FontFamily.bold]: Geist_700Bold,
    [FontFamily.monoMedium]: JetBrainsMono_500Medium,
    [FontFamily.monoBold]: JetBrainsMono_700Bold,
};
