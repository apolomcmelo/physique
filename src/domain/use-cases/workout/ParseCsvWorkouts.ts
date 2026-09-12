import { Workout, WorkoutType, Exercise, createExercise, createWorkout } from '../../entities/Workout';

/**
 * Known workout activity names from the CSV (Portuguese) mapped to WorkoutType.
 * The CSV column "atividade/refeição" must use exactly one of these names
 * for a row to be treated as a workout.
 */
const WORKOUT_ACTIVITY_MAP: Record<string, WorkoutType> = {
    Calistenia: 'Calisthenics',
    HIT: 'HIT',
    Musculação: 'Weightlifting',
};

export const KNOWN_WORKOUT_ACTIVITIES = Object.keys(WORKOUT_ACTIVITY_MAP);

export function isWorkoutRow(activity: string): boolean {
    return activity in WORKOUT_ACTIVITY_MAP;
}

/** Portuguese weekday names (lowercase) mapped to Date.getDay() indexes. */
const WEEKDAY_INDEX: Record<string, number> = {
    'domingo': 0,
    'segunda-feira': 1,
    'terça-feira': 2,
    'terca-feira': 2,
    'quarta-feira': 3,
    'quinta-feira': 4,
    'sexta-feira': 5,
    'sábado': 6,
    'sabado': 6,
};

/**
 * Computes the next occurrence of a weekday at a given time (HH:MM).
 * Returns null when the day or time cannot be parsed.
 */
export function nextOccurrence(day: string, time: string, now: Date = new Date()): Date | null {
    const dayIndex = WEEKDAY_INDEX[day.trim().toLowerCase()];
    const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})/);
    if (dayIndex === undefined || !timeMatch) return null;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const result = new Date(now);
    result.setHours(hours, minutes, 0, 0);

    let daysAhead = (dayIndex - now.getDay() + 7) % 7;
    if (daysAhead === 0 && result.getTime() <= now.getTime()) {
        daysAhead = 7;
    }
    result.setDate(result.getDate() + daysAhead);
    return result;
}

/** Matches the leading prescription of an exercise segment: "4x 10-12", "3x 45s", "3x 1 a 1:20min", or a bare "26". */
const PRESCRIPTION_REGEX = /^(?:(\d+)\s*x\s+)?(\d+(?:-\d+|\s*a\s*[\d:]+)?)(min|s)?\s+([\s\S]*)$/;

/** Matches an "N séries:" prefix that applies one set count to every exercise in the description. */
const SHARED_SETS_PREFIX_REGEX = /^(\d+)\s+s[ée]ries\s*:\s*(.+)$/;

/** Matches trailing weight annotations like "(7kg)" or "(2 anilhas de 1.5kg)". */
const WEIGHT_SUFFIX_REGEX = /^(.*?)\s*\(([^)]*)\)$/;

function parseWeight(text: string): number | null {
    const weights = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*kg/gi)];
    if (weights.length === 0) return null;
    return parseFloat(weights[weights.length - 1][1].replace(',', '.'));
}

function parsePrescription(
    countText: string,
    unit: string | undefined,
): { reps: number | null; durationSeconds: number | null; durationLabel: string | null } {
    const aRange = countText.match(/^(\d+)\s*a\s*([\d:]+)$/);
    if (aRange) {
        return {
            reps: null,
            durationSeconds: parseDurationSeconds(aRange[1], unit),
            durationLabel: `${aRange[1]} a ${aRange[2]}${unit ?? ''}`,
        };
    }
    if (unit === 's' || unit === 'min') {
        return {
            reps: null,
            durationSeconds: parseDurationSeconds(countText, unit),
            durationLabel: `${countText}${unit}`,
        };
    }
    // "10-12" is a rep range — keep the lower bound as the target
    const lower = countText.split('-')[0];
    return { reps: parseInt(lower, 10), durationSeconds: null, durationLabel: null };
}

/** Converts "45" (s), "1:20" (min) etc. to seconds. "min" values use MM:SS when they contain a colon. */
function parseDurationSeconds(value: string, unit: string | undefined): number | null {
    if (value.includes(':')) {
        const [minutes, seconds] = value.split(':').map((p) => parseInt(p, 10));
        if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
        return minutes * 60 + seconds;
    }
    const amount = parseInt(value, 10);
    if (Number.isNaN(amount)) return null;
    return unit === 'min' ? amount * 60 : amount;
}

function parseRestIntervals(text: string): { restSecondsBetweenSets: number | null; restSecondsBeforeNextExercise: number | null } {
    const normalized = text.toLowerCase();
    const restMatch = normalized.match(/(?:rest|descanso|pausa)\s*:?\s*(\d+)\s*(?:s|seg|segundos?)?(?:\s*(?:\/|,|\|)\s*(\d+)\s*(?:s|seg|segundos?)?\s*(?:transi[cç][aã]o|transicao|pr[óo]ximo|proximo)?)?/i);

    if (restMatch) {
        const between = parseInt(restMatch[1], 10);
        const transition = restMatch[2] ? parseInt(restMatch[2], 10) : null;
        return {
            restSecondsBetweenSets: between,
            restSecondsBeforeNextExercise: transition,
        };
    }

    const transitionOnlyMatch = normalized.match(/(?:transi[cç][aã]o|transicao|pr[óo]ximo|proximo)\s*(?:.*?)(\d+)\s*(?:s|seg|segundos?)/i);
    if (transitionOnlyMatch) {
        return {
            restSecondsBetweenSets: null,
            restSecondsBeforeNextExercise: parseInt(transitionOnlyMatch[1], 10),
        };
    }

    return {
        restSecondsBetweenSets: null,
        restSecondsBeforeNextExercise: null,
    };
}

function parseExerciseSegment(segment: string, sharedSets: number | null): Exercise | null {
    const trimmed = segment.trim();
    if (!trimmed) return null;

    const match = trimmed.match(PRESCRIPTION_REGEX);
    if (!match) return null;

    const [, setsText, countText, unit, restText] = match;
    const rest = restText.trim();
    if (!rest) return null;

    const weightMatch = rest.match(WEIGHT_SUFFIX_REGEX);
    const baseText = (weightMatch ? weightMatch[1] : rest).trim();
    const name = baseText.replace(/\s*\(.*?\)$/, '').trim();
    if (!name) return null;

    const { reps, durationSeconds, durationLabel } = parsePrescription(countText, unit);
    const restIntervals = parseRestIntervals(weightMatch ? weightMatch[2] : rest);
    const noteParts = [durationLabel];
    if (weightMatch) {
        const annotation = weightMatch[2].replace(/[\d.,]+\s*kg/gi, '').trim();
        if (annotation) noteParts.push(`(${annotation})`);
    }

    return createExercise({
        name,
        orderIndex: 0,
        sets: setsText ? parseInt(setsText, 10) : sharedSets,
        repsPerSet: reps,
        weightKg: weightMatch ? parseWeight(weightMatch[2]) : null,
        durationSeconds,
        restSecondsBetweenSets: restIntervals.restSecondsBetweenSets,
        restSecondsBeforeNextExercise: restIntervals.restSecondsBeforeNextExercise,
        notes: noteParts.filter(Boolean).join(' ') || null,
    });
}

function parseRestOnlySegment(segment: string): number | null {
    const trimmed = segment.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^\s*(\d+)\s*(?:s|seg|segundos?)\s*(?:rest|descanso|pausa|transi[cç][aã]o|transicao)?\s*$/i);
    return match ? parseInt(match[1], 10) : null;
}

function splitAlternatives(segment: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const char of segment) {
        if (char === '(') {
            parenDepth += 1;
            current += char;
            continue;
        }

        if (char === ')') {
            parenDepth = Math.max(0, parenDepth - 1);
            current += char;
            continue;
        }

        if (char === '/' && parenDepth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

export function parseExercises(description: string): Exercise[] {
    const trimmed = description.trim();
    if (!trimmed) return [];

    const sharedMatch = trimmed.match(SHARED_SETS_PREFIX_REGEX);
    const body = sharedMatch ? sharedMatch[2] : trimmed;
    const sharedSets = sharedMatch ? parseInt(sharedMatch[1], 10) : null;

    const exercises: Exercise[] = [];
    let trailingRestSeconds: number | null = null;

    for (const segment of body.split('+')) {
        const restOnlyValue = parseRestOnlySegment(segment);
        if (restOnlyValue !== null) {
            trailingRestSeconds = restOnlyValue;
            continue;
        }

        const alternatives = splitAlternatives(segment);
        const [primary, ...others] = alternatives;
        const exercise = parseExerciseSegment(primary, sharedSets);
        if (!exercise) continue;

        if (others.length > 0) {
            const alt = others.join('/').trim();
            exercise.notes = exercise.notes ? `${exercise.notes} ou ${alt}` : `ou ${alt}`;
        }

        if (trailingRestSeconds !== null) {
            exercise.restSecondsBeforeNextExercise = trailingRestSeconds;
            trailingRestSeconds = null;
        }

        exercises.push(exercise);
    }

    const orderedExercises = exercises.map((exercise, index) => ({ ...exercise, orderIndex: index }));

    if (orderedExercises.length === 0) {
        return [
            createExercise({
                name: trimmed,
                orderIndex: 0,
                sets: null,
                repsPerSet: null,
                weightKg: null,
                durationSeconds: null,
                restSecondsBetweenSets: null,
                restSecondsBeforeNextExercise: null,
                notes: trimmed,
            }),
        ];
    }

    if (trailingRestSeconds !== null && orderedExercises.length > 0) {
        orderedExercises[orderedExercises.length - 1].restSecondsBeforeNextExercise = trailingRestSeconds;
    }

    return orderedExercises;
}

/**
 * Parses CSV content and returns Workout entities for rows whose
 * "atividade/refeição" column matches a known workout type.
 *
 * Expected CSV format (semicolon-separated):
 *   dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
 *
 * - "horário" must be a start time only (e.g. "07:00"), not a range.
 * - "atividade/refeição" must be one of: Calistenia, HIT, Musculação.
 */
export function parseCsvWorkouts(csvContent: string): Workout[] {
    const lines = csvContent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    // Skip header row
    const dataLines = lines.slice(1);

    const workouts: Workout[] = [];

    for (const line of dataLines) {
        const columns = line.split(';');
        if (columns.length < 5) continue;

        const [day, time, activity, description, focus] = columns.map((c) => c.trim());

        if (!day || !time || !activity || !description) continue;

        const workoutType = WORKOUT_ACTIVITY_MAP[activity];
        if (!workoutType) continue;

        workouts.push(
            createWorkout({
                name: focus || activity,
                type: workoutType,
                exercises: parseExercises(description),
                scheduledAt: nextOccurrence(day, time),
            }),
        );
    }

    return workouts;
}
