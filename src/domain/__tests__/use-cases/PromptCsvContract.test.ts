import { generateNewPlanPrompt } from '../../use-cases/prompt/GenerateNewPlanPrompt';
import { generateReviewPrompt } from '../../use-cases/prompt/GenerateReviewPrompt';
import { readRoutineCsv, ROUTINE_CSV_HEADER } from '../../use-cases/routine/ReadRoutineCsv';
import { validateRoutineCsv } from '../../use-cases/routine/ValidateRoutineCsv';
import { mockUser } from '../setup';

it('both prompts request the same header, quoted semicolon CSV, and one-series timed HIT', () => {
    const prompts = [generateNewPlanPrompt(mockUser, [], [], []), generateReviewPrompt(mockUser, [], [], [], [], [])];
    for (const prompt of prompts) {
        expect(prompt).toContain(ROUTINE_CSV_HEADER);
        expect(prompt).toContain('1x 25min Treino HIT');
        expect(prompt).toContain('escaped double quotes');
        expect(prompt).toContain('Portuguese');
    }
    expect(readRoutineCsv(`${ROUTINE_CSV_HEADER}\nQuarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio`)).toHaveLength(1);
});

it('the sample workout prescriptions requested in both prompts are valid for strict preview', () => {
    const csv = `${ROUTINE_CSV_HEADER}\nTerça-feira;18:30;Musculação;3x 10 Supino reto (7kg) (descanso: 20s / 30s transição) + 3x 45s Prancha;Peitoral\nQuarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio`;
    expect(validateRoutineCsv(csv).workouts.map((workout) => workout.exercises.length)).toEqual([2, 1]);
});

it('both prompts exclude the superseded notes-only HIT example', () => {
    for (const prompt of [generateNewPlanPrompt(mockUser, [], [], []), generateReviewPrompt(mockUser, [], [], [], [], [])]) {
        expect(prompt).not.toContain('20 a 25 minutos de treino HIIT ou Tabata');
    }
});

it('the contract explicitly requests all mandatory row fields and line-safe quoting', () => {
    const text = generateNewPlanPrompt(mockUser, [], [], []);
    expect(text).toContain('semicolon-separated CSV');
    expect(text).toContain('doubled escaped double quotes');
    expect(text).toContain('HH:MM');
});

it('the common contract gives a valid quoted meal and timed HIT fixture', () => {
    const csv = `${ROUTINE_CSV_HEADER}\nSegunda-feira;07:00;Café;"Pão; ovos";Energia\nQuarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio`;
    expect(validateRoutineCsv(csv).meals[0].description).toBe('Pão; ovos');
});

it('does not tell either LLM to emit an ambiguous free-text HIT workout', () => {
    for (const prompt of [generateNewPlanPrompt(mockUser, [], [], []), generateReviewPrompt(mockUser, [], [], [], [], [])]) {
        expect(prompt).toContain('never use vague notes-only HIT');
    }
});

it('requests recommendations and plan output in Portuguese in both flows', () => {
    for (const prompt of [generateNewPlanPrompt(mockUser, [], [], []), generateReviewPrompt(mockUser, [], [], [], [], [])]) {
        expect(prompt).toContain('Brazilian Portuguese');
    }
});
