import { Workout, WorkoutType, createWorkout } from '../../entities/Workout';

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

        const [day, time, activity, description] = columns.map((c) => c.trim());

        if (!day || !time || !activity || !description) continue;

        const workoutType = WORKOUT_ACTIVITY_MAP[activity];
        if (!workoutType) continue;

        workouts.push(
            createWorkout({
                name: description || activity,
                type: workoutType,
                exercises: [],
                scheduledAt: null,
            }),
        );
    }

    return workouts;
}
