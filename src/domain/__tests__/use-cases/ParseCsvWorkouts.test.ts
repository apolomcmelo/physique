import { parseCsvWorkouts, isWorkoutRow, KNOWN_WORKOUT_ACTIVITIES, nextOccurrence } from '../../use-cases/workout/ParseCsvWorkouts';
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
        expect(workouts[0].name).toBe('Força funcional');
        expect(workouts[0].exercises).toHaveLength(1);
        expect(workouts[0].exercises[0].name).toBe('Treino de calistenia');
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

    it('schedules workouts from weekday name and time columns', () => {
        const csv = `${HEADER}\nSegunda-feira;07:00;Calistenia;Prancha e wall sit;Core`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(1);
        const at = workouts[0].scheduledAt;
        expect(at).not.toBeNull();
        expect(at!.getDay()).toBe(1); // Monday
        expect(at!.getHours()).toBe(7);
        expect(at!.getMinutes()).toBe(0);
        expect(at!.getTime()).toBeGreaterThan(Date.now());
    });

    it('accepts weekday names without accents', () => {
        const csv = `${HEADER}\nSabado;09:30;HIT;Tabata;Cardio`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts[0].scheduledAt).not.toBeNull();
        expect(workouts[0].scheduledAt!.getDay()).toBe(6); // Saturday
    });

    it('parses structured exercises from sets/reps segments', () => {
        const csv = `${HEADER}\nSegunda-feira;18:30;Musculação;4x 10-12 Flexão declinada + 3x 10-12 Pullover (7kg);Peitoral`;
        const workouts = parseCsvWorkouts(csv);
        expect(workouts).toHaveLength(1);
        expect(workouts[0].exercises).toHaveLength(2);
        expect(workouts[0].exercises[0]).toMatchObject({
            name: 'Flexão declinada',
            sets: 4,
            repsPerSet: 10,
            weightKg: null,
        });
        expect(workouts[0].exercises[1]).toMatchObject({
            name: 'Pullover',
            sets: 3,
            repsPerSet: 10,
            weightKg: 7,
            durationSeconds: null,
        });
    });

    it('parses time-based sets (e.g. "4x 45s") into durationSeconds', () => {
        const csv = `${HEADER}\nTerça-feira;18:30;Musculação;4x 45s Wall sit (4.5kg);Pernas`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.exercises).toHaveLength(1);
        expect(workout.exercises[0]).toMatchObject({
            name: 'Wall sit',
            sets: 4,
            repsPerSet: null,
            weightKg: 4.5,
            durationSeconds: 45,
            notes: '45s',
        });
    });

    it('parses rest intervals and assigns order indexes from exercise sequence', () => {
        const csv = `${HEADER}\nSegunda-feira;18:30;Musculação;4x 10-12 Flexão declinada (descanso: 15s / 30s transição) + 3x 12-15 Bicep curl (4kg) + 3x 45s Prancha + 15s rest;Peitoral`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.exercises.map((exercise) => exercise.name)).toEqual([
            'Flexão declinada',
            'Bicep curl',
            'Prancha',
        ]);
        expect(workout.exercises.map((exercise) => exercise.orderIndex)).toEqual([0, 1, 2]);
        expect(workout.exercises[0]).toMatchObject({
            restSecondsBetweenSets: 15,
            restSecondsBeforeNextExercise: 30,
        });
        expect(workout.exercises[1]).toMatchObject({
            restSecondsBetweenSets: null,
            restSecondsBeforeNextExercise: null,
        });
    });

    it('parses "N séries:" prefix as a set count applied to all segments', () => {
        const csv = `${HEADER}\nSegunda-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit (2 anilhas de 1.5kg) + 26 shoulder taps;Core`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.exercises).toHaveLength(3);
        expect(workout.exercises[0]).toMatchObject({
            name: 'prancha',
            sets: 3,
            repsPerSet: null,
            weightKg: null,
            durationSeconds: 45,
            notes: '45s',
        });
        expect(workout.exercises[1]).toMatchObject({
            name: 'wall sit',
            sets: 3,
            repsPerSet: null,
            weightKg: 1.5,
            durationSeconds: 35,
            notes: '35s (2 anilhas de)',
        });
        expect(workout.exercises[2]).toMatchObject({
            name: 'shoulder taps',
            sets: 3,
            repsPerSet: 26,
        });
    });

    it('splits alternative exercises on "/" and keeps the alternative in notes', () => {
        const csv = `${HEADER}\nSegunda-feira;18:30;Musculação;3x 12-15 Bicep curl (4kg) / KB halo (7.5kg);Braços`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.exercises).toHaveLength(1);
        expect(workout.exercises[0]).toMatchObject({
            name: 'Bicep curl',
            sets: 3,
            repsPerSet: 12,
            weightKg: 4,
            notes: 'ou KB halo (7.5kg)',
        });
    });

    it('parses free-text activities (e.g. HIT duration) into a notes exercise', () => {
        const csv = `${HEADER}\nQuarta-feira;18:30;HIT;20 a 25 minutos de treino HIIT ou Tabata;Cardio`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.exercises).toHaveLength(1);
        expect(workout.exercises[0]).toMatchObject({
            name: 'minutos de treino HIIT ou Tabata',
            sets: null,
            repsPerSet: null,
            weightKg: null,
            notes: '20 a 25',
        });
    });

    it('keeps the focus column as the workout name', () => {
        const csv = `${HEADER}\nSegunda-feira;18:30;Musculação;4x 10-12 Flexão declinada;Hipertrofia do peitoral`;
        const [workout] = parseCsvWorkouts(csv);
        expect(workout.name).toBe('Hipertrofia do peitoral');
    });

    it('parses the full weekly plan CSV (10 workout rows)', () => {
        const rows = [
            'Segunda-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit;Core',
            'Segunda-feira;18:30;Musculação;4x 10-12 Flexão declinada;Peitoral',
            'Terça-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit;Core',
            'Terça-feira;18:30;Musculação;4x 45s Wall sit (4.5kg);Posterior',
            'Quarta-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit;Core',
            'Quarta-feira;18:30;HIT;20 a 25 minutos de treino HIIT ou Tabata;Cardio',
            'Quinta-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit;Core',
            'Quinta-feira;18:30;Musculação;4x 10-12 Flexão declinada;Peitoral',
            'Sexta-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit;Core',
            'Sexta-feira;18:30;Musculação;4x 45s Wall sit (4.5kg);Posterior',
        ];
        const workouts = parseCsvWorkouts([HEADER, ...rows].join('\n'));
        expect(workouts).toHaveLength(10);
        expect(workouts.every((w) => w.scheduledAt !== null)).toBe(true);
        expect(workouts.filter((w) => w.type === 'Calisthenics')).toHaveLength(5);
        expect(workouts.filter((w) => w.type === 'Weightlifting')).toHaveLength(4);
        expect(workouts.filter((w) => w.type === 'HIT')).toHaveLength(1);
    });

    it('parses exercises for every workout row of the user weekly plan', () => {
        const rows = [
            'Segunda-feira;07:00;Calistenia;3 séries: 45s prancha + 35s wall sit (2 anilhas de 1.5kg) + 26 shoulder taps;Core',
            'Segunda-feira;18:30;Musculação;4x 10-12 Flexão declinada + 4x 10-12 Flexão deficitária + 3x 12-15 Squeeze press/Crucifixo + 4x 10-12 Remada curvada (11kg) + 3x 10-12 Pullover (7kg) + 3x 12-15 Bicep curl (4kg) / KB halo (7.5kg);Peitoral',
            'Terça-feira;18:30;Musculação;4x 45s Wall sit (4.5kg) + 4x 12 Romanian deadlift (14kg) + 4x 20 Kettlebell swing (7.5kg) + 4x 12 Trapézio (8.25kg) + 3x 12 Agachamento (14kg) + 3x 1 a 1:20min Prancha;Posterior',
            'Quarta-feira;18:30;HIT;20 a 25 minutos de treino HIIT ou Tabata;Cardio',
        ];
        const workouts = parseCsvWorkouts([HEADER, ...rows].join('\n'));
        expect(workouts.map((w) => w.exercises.length)).toEqual([3, 6, 6, 1]);

        const [, strength, posterior, hit] = workouts;
        expect(strength.exercises.map((e) => e.name)).toEqual([
            'Flexão declinada',
            'Flexão deficitária',
            'Squeeze press',
            'Remada curvada',
            'Pullover',
            'Bicep curl',
        ]);
        expect(strength.exercises[2].notes).toBe('ou Crucifixo');
        expect(strength.exercises[5].notes).toBe('ou KB halo (7.5kg)');
        expect(strength.exercises[3]).toMatchObject({ sets: 4, repsPerSet: 10, weightKg: 11 });

        expect(posterior.exercises[1]).toMatchObject({
            name: 'Romanian deadlift',
            sets: 4,
            repsPerSet: 12,
            weightKg: 14,
        });
        expect(posterior.exercises[5]).toMatchObject({
            name: 'Prancha',
            sets: 3,
            repsPerSet: null,
            durationSeconds: 60,
            notes: '1 a 1:20min',
        });

        expect(hit.exercises).toHaveLength(1);
        expect(hit.exercises[0].sets).toBeNull();
    });
});

describe('nextOccurrence', () => {
    it('returns the same day when the time is still ahead', () => {
        const now = new Date(2026, 8, 10, 6, 0); // Thursday 06:00
        const result = nextOccurrence('Quinta-feira', '18:30', now);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(4);
        expect(result!.getDate()).toBe(10);
        expect(result!.getHours()).toBe(18);
        expect(result!.getMinutes()).toBe(30);
    });

    it('rolls to next week when the time today has already passed', () => {
        const now = new Date(2026, 8, 10, 19, 0); // Thursday 19:00
        const result = nextOccurrence('Quinta-feira', '07:00', now);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(4);
        expect(result!.getDate()).toBe(17);
    });

    it('returns the upcoming weekday in the same week', () => {
        const now = new Date(2026, 8, 10, 12, 0); // Thursday
        const result = nextOccurrence('Segunda-feira', '07:00', now);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(1);
        expect(result!.getDate()).toBe(14);
    });

    it('returns null for unknown day or invalid time', () => {
        expect(nextOccurrence('Dia 1', '07:00')).toBeNull();
        expect(nextOccurrence('Segunda-feira', 'manhã')).toBeNull();
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
