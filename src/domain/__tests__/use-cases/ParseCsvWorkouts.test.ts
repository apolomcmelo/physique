import { parseCsvWorkouts, isWorkoutRow, KNOWN_WORKOUT_ACTIVITIES } from '../../use-cases/workout/ParseCsvWorkouts';
import { parseCsvMealPlan } from '../../use-cases/meal/ParseCsvMealPlan';

const HEADER = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';

describe('isWorkoutRow', () => {
    it('returns true for known workout activities', () => {
        expect(isWorkoutRow('Calistenia')).toBe(true);
        expect(isWorkoutRow('HIT')).toBe(true);
        expect(isWorkoutRow('Musculação')).toBe(true);
    });

    it('returns false for meal activities', () => {
        expect(isWorkoutRow('Café da Manhã')).toBe(false);
        expect(isWorkoutRow('Almoço')).toBe(false);
        expect(isWorkoutRow('Jantar')).toBe(false);
    });

    it('returns false for unknown/empty strings', () => {
        expect(isWorkoutRow('')).toBe(false);
        expect(isWorkoutRow('Corrida')).toBe(false);
    });
});

describe('KNOWN_WORKOUT_ACTIVITIES', () => {
    it('contains exactly the three known workout types', () => {
        expect(KNOWN_WORKOUT_ACTIVITIES).toContain('Calistenia');
        expect(KNOWN_WORKOUT_ACTIVITIES).toContain('HIT');
        expect(KNOWN_WORKOUT_ACTIVITIES).toContain('Musculação');
    });
});

describe('parseCsvWorkouts', () => {
    it('returns empty array for empty CSV', () => {
        expect(parseCsvWorkouts('')).toHaveLength(0);
    });

    it('returns empty array for header-only CSV', () => {
        expect(parseCsvWorkouts(HEADER)).toHaveLength(0);
    });

    it('parses a Calistenia row and maps to Calisthenics type', () => {
        const csv = `${HEADER}\n1;07:00;Calistenia;Treino de calistenia;Força funcional`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(1);
        expect(workouts[0].type).toBe('Calisthenics');
        expect(workouts[0].name).toBe('Treino de calistenia');
        expect(workouts[0].exercises).toHaveLength(0);
        expect(workouts[0].scheduledAt).toBeNull();
    });

    it('parses a HIT row and maps to HIT type', () => {
        const csv = `${HEADER}\n2;06:30;HIT;Treino intervalado;Queimar gordura`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(1);
        expect(workouts[0].type).toBe('HIT');
    });

    it('parses a Musculação row and maps to Weightlifting type', () => {
        const csv = `${HEADER}\n3;08:00;Musculação;Treino de hipertrofia;Ganho de massa`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(1);
        expect(workouts[0].type).toBe('Weightlifting');
    });

    it('ignores meal rows and only returns workout rows', () => {
        const csv = [
            HEADER,
            '1;07:00;Calistenia;Treino funcional;Força',
            '1;08:00;Café da Manhã;Aveia com frutas;Energia',
            '2;12:00;Almoço;Frango e arroz;Proteína',
            '3;06:30;HIT;Intervalado;Gordura',
        ].join('\n');

        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(2);
        expect(workouts[0].type).toBe('Calisthenics');
        expect(workouts[1].type).toBe('HIT');
    });

    it('skips rows with fewer than 5 columns', () => {
        const csv = `${HEADER}\n1;07:00;Calistenia;Treino`;
        expect(parseCsvWorkouts(csv)).toHaveLength(0);
    });

    it('generates unique IDs for each workout', () => {
        const csv = [
            HEADER,
            '1;07:00;Calistenia;Treino A;Força',
            '2;08:00;HIT;Treino B;Queima',
        ].join('\n');
        const workouts = parseCsvWorkouts(csv);
        expect(workouts[0].id).not.toBe(workouts[1].id);
    });
});

describe('parseCsvMealPlan — excludes workout rows', () => {
    it('does not include workout activities in meal entries', () => {
        const csv = [
            HEADER,
            '1;07:00;Calistenia;Treino funcional;Força',
            '1;08:30;Café da Manhã;Aveia com frutas;Energia',
            '2;12:00;Almoço;Frango e arroz;Proteína',
            '3;06:30;HIT;Intervalado;Gordura',
            '3;19:00;Jantar;Salada com atum;Recuperação',
        ].join('\n');

        const meals = parseCsvMealPlan(csv);
        expect(meals).toHaveLength(3);
        expect(meals.every((m) => !isWorkoutRow(m.activity))).toBe(true);
    });

    it('returns all entries when no workout rows are present', () => {
        const csv = [
            HEADER,
            '1;08:30;Café da Manhã;Aveia;Energia',
            '1;12:00;Almoço;Arroz e feijão;Proteína',
        ].join('\n');
        expect(parseCsvMealPlan(csv)).toHaveLength(2);
    });
});
