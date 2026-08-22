import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/ui/hooks/useAuth';
import { Button } from '../src/ui/components/Button';
import { Typography } from '../src/ui/components/Typography';
import { Colors, Spacing, Typography as TypographyTheme } from '../src/ui/theme';

export default function LoginScreen() {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGoogleSignIn() {
        try {
            setLoading(true);
            setError(null);
            await signInWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao entrar com Google');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Typography variant="h2" color={Colors.textPrimary} style={styles.title}>
                    Entrar
                </Typography>
                <Typography variant="body" color={Colors.textSecondary} style={styles.subtitle}>
                    Acesse sua conta para continuar.
                </Typography>

                {error ? (
                    <Typography variant="bodySmall" color={Colors.error} style={styles.errorText}>
                        {error}
                    </Typography>
                ) : null}

                <Button
                    label="Entrar com Google"
                    onPress={handleGoogleSignIn}
                    loading={loading}
                    style={styles.button}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    title: {
        marginBottom: Spacing.xs,
    },
    subtitle: {
        marginBottom: Spacing.lg,
    },
    button: {
        marginTop: Spacing.md,
    },
    errorText: {
        marginBottom: Spacing.md,
    },
});
