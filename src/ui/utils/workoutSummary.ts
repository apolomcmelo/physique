import { Exercise, Workout } from '../../domain/entities/Workout';
import { formatDecimal } from '../components/dashboard/format';

const SECONDS_PER_REP = 3;
const DEFAULT_REPS = 10;
const DEFAULT_REST_SECONDS = 60;
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function totalSets(workout: Workout): number {
    return workout.exercises.reduce((sum, exercise) => sum + (exercise.sets ?? 1), 0);
}

function exerciseSeconds(exercise: Exercise, isLast: boolean): number {
    const sets = exercise.sets ?? 1;
    const setSeconds = exercise.durationSeconds ?? (exercise.repsPerSet ?? DEFAULT_REPS) * SECONDS_PER_REP;
    const restBetweenSets = exercise.restSecondsBetweenSets ?? DEFAULT_REST_SECONDS;
    const restBeforeNext = isLast ? 0 : exercise.restSecondsBeforeNextExercise ?? DEFAULT_REST_SECONDS;
    return sets * setSeconds + (sets - 1) * restBetweenSets + restBeforeNext;
}

/** Rough session length derived from sets, reps/time and rests; null when there is nothing to estimate. */
export function estimateDurationMinutes(workout: Workout): number | null {
    if (workout.exercises.length === 0) return null;
    const lastIndex = workout.exercises.length - 1;
    const seconds = workout.exercises.reduce((sum, exercise, index) => sum + exerciseSeconds(exercise, index === lastIndex), 0);
    return Math.ceil(seconds / 60);
}

export function exerciseDetail(exercise: Exercise): string {
    const volumeUnit = exercise.durationSeconds ? `${exercise.durationSeconds}s` : exercise.repsPerSet ? `${exercise.repsPerSet}` : null;
    const volume = exercise.sets && volumeUnit ? `${exercise.sets}x ${volumeUnit}` : null;
    const load = exercise.weightKg ? `${formatDecimal(exercise.weightKg)} kg` : null;
    return [volume, load].filter(Boolean).join(' • ');
}

export function weekdayLabel(date: Date | null): string | null {
    return date ? WEEKDAYS[date.getDay()] : null;
}

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function matchesSearch(workout: Workout, query: string): boolean {
    const needle = normalize(query.trim());
    if (!needle) return true;
    return [workout.name, ...workout.exercises.map((exercise) => exercise.name)]
        .some((text) => normalize(text).includes(needle));
}
