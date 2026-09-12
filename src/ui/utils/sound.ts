import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export type TimerCue = 'countdown' | 'complete' | null;

export const getTimerCue = (remainingSeconds: number): TimerCue => {
    if (remainingSeconds === 0) return 'complete';
    if (remainingSeconds >= 1 && remainingSeconds <= 5) return 'countdown';
    return null;
};

const SAMPLE_RATE = 44100;

const createWavDataUri = (frequency: number, durationMs: number): string => {
    const sampleCount = Math.floor(SAMPLE_RATE * durationMs / 1000);
    const bytes = new Uint8Array(44 + sampleCount * 2);
    const view = new DataView(bytes.buffer);
    const writeText = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index += 1) {
            bytes[offset + index] = value.charCodeAt(index);
        }
    };

    writeText(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    for (let index = 0; index < sampleCount; index += 1) {
        const progress = index / sampleCount;
        const envelope = Math.min(1, progress * 30, (1 - progress) * 30);
        const sample = Math.sin(2 * Math.PI * frequency * index / SAMPLE_RATE) * envelope * 0.35;
        view.setInt16(44 + index * 2, sample * 32767, true);
    }

    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
};

const playWebTone = (frequency: number, durationMs: number): void => {
    const AudioContextConstructor = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);
    oscillator.addEventListener('ended', () => void context.close());
};

const playNativeTone = async (frequency: number, durationMs: number): Promise<void> => {
    const { sound } = await Audio.Sound.createAsync({
        uri: createWavDataUri(frequency, durationMs),
    });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync();
        }
    });
};

export const playTimerCue = async (remainingSeconds: number): Promise<void> => {
    const cue = getTimerCue(remainingSeconds);
    if (!cue) return;

    const frequency = cue === 'complete' ? 1320 : 880;
    const durationMs = cue === 'complete' ? 400 : 100;

    try {
        if (Platform.OS === 'web') {
            playWebTone(frequency, durationMs);
        } else {
            await playNativeTone(frequency, durationMs);
        }
    } catch {
        // Audio is feedback only; a denied audio context must not stop a workout.
    }
};