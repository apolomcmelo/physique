import { Exercise } from '../../domain/entities/Workout';
import { formatDecimal } from '../components/dashboard/format';

export type QueueStatus = 'done' | 'current' | 'next' | 'pending';

export interface SessionProgress {
    totalSets: number;
    doneSets: number;
    currentSet: number;
    percent: number;
}

export function sessionProgress(exercises: Exercise[], doneSets: number): SessionProgress {
    const totalSets = exercises.reduce((sum, exercise) => sum + (exercise.sets ?? 1), 0);
    if (totalSets === 0) return { totalSets: 0, doneSets: 0, currentSet: 0, percent: 0 };
    const done = Math.min(doneSets, totalSets);
    return {
        totalSets,
        doneSets: done,
        currentSet: Math.min(done + 1, totalSets),
        percent: Math.round((done / totalSets) * 100),
    };
}

export function exerciseQueueStatus(index: number, currentIndex: number, finalSetRecorded: boolean): QueueStatus {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return finalSetRecorded ? 'done' : 'current';
    return index === currentIndex + 1 ? 'next' : 'pending';
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

export function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

export function formatElapsed(ms: number): string {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(seconds / 3600);
    const rest = formatClock(seconds % 3600);
    return hours > 0 ? `${hours}:${rest}` : rest;
}

function formatDuration(seconds: number): string {
    return seconds >= 60 ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}min` : `${seconds}s`;
}

export function setTarget(exercise: Exercise): string {
    const volume = exercise.durationSeconds ? formatDuration(exercise.durationSeconds) : `${exercise.repsPerSet ?? 0} reps`;
    return exercise.weightKg ? `${volume} com ${formatDecimal(exercise.weightKg)} kg` : volume;
}

export function queueDetail(exercise: Exercise, status: QueueStatus): string {
    const sets = exercise.sets ?? 1;
    if (status === 'done') return `${sets} séries concluídas`;
    const volume = exercise.durationSeconds ? formatDuration(exercise.durationSeconds) : `${exercise.repsPerSet ?? 0} reps`;
    const prescription = `${sets}x ${volume}`;
    return exercise.weightKg ? `${prescription} • ${formatDecimal(exercise.weightKg)} kg` : prescription;
}
