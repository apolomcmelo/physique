import { Workout, createWorkout, WorkoutType } from '../../entities/Workout';
import { MealPlanEntry, createMealPlanEntry } from '../../entities/MealPlan';
import { parseStrictExercises } from '../workout/ParseCsvWorkouts';
import { readRoutineCsv, RoutineCsvRow } from './ReadRoutineCsv';

const workoutTypes: Record<string, WorkoutType> = { Calistenia: 'Calisthenics', Musculação: 'Weightlifting', HIT: 'HIT' };

export interface RoutinePreview {
    meals: MealPlanEntry[];
    workouts: Workout[];
    firstRow: RoutineCsvRow;
    rows: RoutineCsvRow[];
}

export function validateRoutineCsv(csv: string): RoutinePreview {
    const rows = readRoutineCsv(csv);
    const meals: MealPlanEntry[] = [];
    const workouts: Workout[] = [];
    for (const row of rows) {
        try {
            const type = workoutTypes[row.activity];
            if (type) {
                workouts.push(createWorkout({ name: row.focus, type, exercises: parseStrictExercises(row.description, row.activity), scheduledAt: null }));
            } else {
                if (/^(?:\d+\s*s[ée]ries\s*:\s*)?\d+\s*x\s+\d+/i.test(row.description)) throw new Error('atividade ambígua: tipo de treino desconhecido');
                meals.push(createMealPlanEntry({ day: row.day, time: row.time, activity: row.activity,
                    description: row.description, biologicalObjective: row.focus }));
            }
        } catch (error) {
            throw new Error(`Linha ${row.line}: ${error instanceof Error ? error.message : 'atividade inválida'}`);
        }
    }
    return { meals, workouts, firstRow: rows[0], rows };
}
