import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRepositories } from '../../src/ui/hooks/useSupabase';
import { LevelIndicator } from '../../src/ui/components/LevelIndicator';
import { Typography as TypographyText } from '../../src/ui/components/Typography';
import { Colors, Spacing, Radius, Typography } from '../../src/ui/theme';
import { useAccelerometer } from '../../src/ui/hooks/useAccelerometer';
import { BodyPhotoAngle, createBodyPhoto } from '../../src/domain/entities/BodyPhoto';
import { arePhotosConsistent } from '../../src/domain/use-cases/photo/ArePhotosConsistent';
import { supabase } from '../../src/infrastructure/supabase/client';

const ANGLES: { key: BodyPhotoAngle; label: string }[] = [
    { key: 'front', label: 'Frente' },
    { key: 'back', label: 'Costas' },
    { key: 'left', label: 'Esquerda' },
    { key: 'right', label: 'Direita' },
];

export default function CameraScreen() {
    const { photoRepo, userRepo } = useRepositories();
    const accelerometer = useAccelerometer();

    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [locationGranted, setLocationGranted] = useState(false);
    const [selectedAngle, setSelectedAngle] = useState<BodyPhotoAngle>('front');
    const [previousPhotoUrl, setPreviousPhotoUrl] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [consistencyResult, setConsistencyResult] = useState<{ consistent: boolean; reasons: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        requestLocationPermission();
    }, []);

    useEffect(() => {
        loadPreviousPhoto(selectedAngle);
        setConsistencyResult(null);
    }, [selectedAngle]);

    async function requestLocationPermission() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationGranted(status === 'granted');
    }

    async function loadPreviousPhoto(angle: BodyPhotoAngle) {
        try {
            const photo = await photoRepo.getLatestPhotoByAngle(angle);
            setPreviousPhotoUrl(photo?.fileUrl ?? null);
        } catch {
            setPreviousPhotoUrl(null);
        }
    }

    async function handleCapture() {
        if (!cameraRef.current) return;
        try {
            setCapturing(true);
            setError(null);
            setConsistencyResult(null);

            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
            if (!photo?.uri) throw new Error('Captura falhou');

            // Get location
            let latitude: number | null = null;
            let longitude: number | null = null;
            if (locationGranted) {
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    latitude = loc.coords.latitude;
                    longitude = loc.coords.longitude;
                } catch {
                    // location optional
                }
            }

            // Upload to Supabase Storage
            const user = await userRepo.getUser();
            const now = new Date();
            const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const storagePath = `photos/${user?.id ?? 'user'}/${monthYear}_${selectedAngle}_${Date.now()}.jpg`;

            let fileUrl: string;
            if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
                fileUrl = photo.uri;
            } else {
                const response = await fetch(photo.uri);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                const { error: uploadError } = await supabase.storage
                    .from('body-photos')
                    .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg' });

                if (uploadError) throw new Error(uploadError.message);

                const { data: publicData } = supabase.storage.from('body-photos').getPublicUrl(storagePath);
                fileUrl = publicData.publicUrl;
            }

            // Check consistency with previous photo
            const previous = await photoRepo.getLatestPhotoByAngle(selectedAngle);

            const bodyPhoto = createBodyPhoto({
                userId: user?.id ?? '',
                capturedAt: now,
                angle: selectedAngle,
                fileUrl,
                accelerometerX: accelerometer.x,
                accelerometerY: accelerometer.y,
                accelerometerZ: accelerometer.z,
                latitude,
                longitude,
                luminosity: null,
                monthYear,
            });

            await photoRepo.saveBodyPhoto(bodyPhoto);

            if (previous) {
                const result = arePhotosConsistent(bodyPhoto, previous);
                setConsistencyResult(result);
            }

            setPreviousPhotoUrl(fileUrl);
        } catch (e) {
            setError('Erro ao capturar foto');
        } finally {
            setCapturing(false);
        }
    }

    if (!cameraPermission) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (!cameraPermission.granted) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.centered}>
                    <TypographyText variant="h3" color={Colors.textPrimary}>
                        Permissão de câmera necessária
                    </TypographyText>
                    <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission}>
                        <Text style={[Typography.h4, { color: Colors.white }]}>Permitir Câmera</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* Camera */}
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
                {/* Ghost overlay of previous photo */}
                {previousPhotoUrl && (
                    <Image
                        source={{ uri: previousPhotoUrl }}
                        style={styles.ghostOverlay}
                        resizeMode="cover"
                    />
                )}

                {/* Level Indicator */}
                <View style={styles.levelContainer}>
                    <LevelIndicator x={accelerometer.x} y={accelerometer.y} />
                </View>

                {/* Consistency Result */}
                {consistencyResult && (
                    <View
                        style={[
                            styles.consistencyBanner,
                            { backgroundColor: consistencyResult.consistent ? Colors.success + 'CC' : Colors.error + 'CC' },
                        ]}
                    >
                        <Text style={[Typography.h4, { color: Colors.white }]}>
                            {consistencyResult.consistent ? '✓ Foto consistente!' : '⚠ Foto inconsistente'}
                        </Text>
                        {!consistencyResult.consistent &&
                            consistencyResult.reasons.map((r, i) => (
                                <Text key={i} style={[Typography.bodySmall, { color: Colors.white }]}>
                                    • {r}
                                </Text>
                            ))}
                    </View>
                )}

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={[Typography.bodySmall, { color: Colors.white }]}>{error}</Text>
                    </View>
                )}
            </CameraView>

            {/* Controls */}
            <SafeAreaView style={styles.controls} edges={['bottom']}>
                {/* Angle selector */}
                <View style={styles.angleRow}>
                    {ANGLES.map((a) => (
                        <TouchableOpacity
                            key={a.key}
                            style={[styles.angleBtn, selectedAngle === a.key && styles.angleBtnActive]}
                            onPress={() => setSelectedAngle(a.key)}
                        >
                            <Text
                                style={[
                                    Typography.label,
                                    { color: selectedAngle === a.key ? Colors.white : Colors.textSecondary },
                                ]}
                            >
                                {a.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Capture + Back */}
                <View style={styles.captureRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={[Typography.label, { color: Colors.textSecondary }]}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
                        onPress={handleCapture}
                        disabled={capturing}
                    >
                        {capturing ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <View style={styles.captureBtnInner} />
                        )}
                    </TouchableOpacity>
                    <View style={{ width: 60 }} />
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    safe: { flex: 1, backgroundColor: Colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: Spacing.md },
    camera: { flex: 1 },
    ghostOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    levelContainer: {
        position: 'absolute',
        top: Spacing.lg,
        right: Spacing.lg,
    },
    consistencyBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: Spacing.md,
        gap: 4,
    },
    errorBanner: {
        position: 'absolute',
        top: Spacing.lg,
        left: Spacing.md,
        right: Spacing.md,
        backgroundColor: Colors.error + 'CC',
        borderRadius: Radius.sm,
        padding: Spacing.sm,
    },
    controls: {
        backgroundColor: Colors.surface,
        paddingTop: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    angleRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    angleBtn: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    angleBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    captureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 60,
        alignItems: 'flex-start',
    },
    captureBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureBtnDisabled: { opacity: 0.5 },
    captureBtnInner: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: Colors.white,
    },
    permBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        marginTop: Spacing.md,
    },
});
