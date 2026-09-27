import { validateRoutineCsv } from '../../use-cases/routine/ValidateRoutineCsv';

const header = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';

it('previews valid meals and a single timed HIT exercise without persisting anything', () => {
    const preview = validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café da Manhã;"Pão; ovos";Energia\nQuarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio`);
    expect(preview.meals).toHaveLength(1);
    expect(preview.meals[0].description).toBe('Pão; ovos');
    expect(preview.workouts).toHaveLength(1);
    expect(preview.workouts[0].exercises).toEqual([expect.objectContaining({ sets: 1, durationSeconds: 1500, repsPerSet: null, weightKg: null })]);
    expect(preview.firstRow).toMatchObject({ day: 'Segunda-feira', time: '07:00' });
});

it('reports the bad workout row and rejects the whole file', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia\nQuarta-feira;06:30;HIT;20 a 25 minutos de treino;Cardio`))
        .toThrow('Linha 3');
});

it('rejects an unknown exercise in a later row without returning partial preview data', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia\nTerça-feira;18:30;Musculação;3x 10 Supino + coisa desconhecida;Peito`))
        .toThrow('Linha 3');
});

it('rejects workout-shaped content with an unknown activity rather than importing it as a meal', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;18:00;Corrida;3x 10 Sprint;Cardio`)).toThrow('Linha 2');
});

it('accepts the documented combined weight/rest example and orders every exercise', () => {
    const plan = validateRoutineCsv(`${header}\nTerça-feira;18:30;Musculação;3x 10 Supino reto (7kg) (descanso: 20s / 30s transição) + 3x 45s Prancha;Peitoral e Core`);
    expect(plan.workouts[0].exercises).toEqual([
        expect.objectContaining({ name: 'Supino reto', weightKg: 7, restSecondsBetweenSets: 20, restSecondsBeforeNextExercise: 30, orderIndex: 0 }),
        expect.objectContaining({ name: 'Prancha', durationSeconds: 45, orderIndex: 1 }),
    ]);
});

it('rejects HIT with extra exercises or rep-based sets', () => {
    expect(() => validateRoutineCsv(`${header}\nQuarta-feira;06:30;HIT;1x 25min Treino HIT + 1x 10 Burpees;Cardio`)).toThrow('Linha 2');
    expect(() => validateRoutineCsv(`${header}\nQuarta-feira;06:30;HIT;1x 10 Burpees;Cardio`)).toThrow('Linha 2');
});

it('shows every scheduled item with its original weekday and time in the preview', () => {
    const preview = validateRoutineCsv(`${header}\nTerça-feira;07:00;Café da Manhã;Ovos;Energia\nQuarta-feira;18:00;HIT;1x 25min Treino HIT;Cardio`);
    expect(preview.rows).toEqual([
        expect.objectContaining({ day: 'Terça-feira', time: '07:00', activity: 'Café da Manhã' }),
        expect.objectContaining({ day: 'Quarta-feira', time: '18:00', activity: 'HIT' }),
    ]);
});

it('rejects an unknown meal label when its description starts with a workout prescription', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;18:00;Treino funcional;3x 10 Flexão;Cardio`)).toThrow('Linha 2');
});

it('keeps meal free text containing plus signs without assigning nutrients or exercises', () => {
    const preview = validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café da Manhã;2 ovos + 1 banana;Energia`);
    expect(preview.meals[0].description).toBe('2 ovos + 1 banana');
    expect(preview.workouts).toEqual([]);
});

it('rejects a malformed exercise in the first workout row before producing any preview', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Musculação;3x 10 Supino + ???;Peito\nTerça-feira;08:00;Café;Ovos;Energia`)).toThrow('Linha 2');
});

it('does not treat a quoted semicolon inside a meal as an extra column', () => {
    const plan = validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"Pão; ovos";Energia`);
    expect(plan.meals[0].description).toBe('Pão; ovos');
});

it('rejects a semicolon in a workout description unless quoted', () => {
    expect(() => validateRoutineCsv(`${header}\nTerça-feira;18:30;Musculação;3x 10 Supino;3x 12 Remada;Peito`)).toThrow('Linha 2');
});

it('preserves weight precision and zero rest in the strict preview', () => {
    const preview = validateRoutineCsv(`${header}\nQuinta-feira;18:00;Musculação;3x 10 Supino (4,5kg) (descanso: 0s / 0s transição);Peito`);
    expect(preview.workouts[0].exercises[0]).toMatchObject({ weightKg: 4.5, restSecondsBetweenSets: 0, restSecondsBeforeNextExercise: 0 });
});

it('rejects a CSV with a valid meal followed by an unknown workout label and prescription', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia\nTerça-feira;18:00;Corrida;3x 10 Sprint;Cardio`)).toThrow('Linha 3');
});

it('rejects a vague HIT description even when a later row is valid', () => {
    expect(() => validateRoutineCsv(`${header}\nQuarta-feira;06:30;HIT;20 a 25 minutos de treino HIIT ou Tabata;Cardio\nQuinta-feira;07:00;Café;Ovos;Energia`)).toThrow('Linha 2');
});

it('requires an actual numeric prescription for every workout row', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;18:00;Musculação;Treino de força;Peito`)).toThrow('Linha 2');
});

it('does not silently skip a malformed workout after an otherwise valid CSV', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia\nTerça-feira;18:00;Musculação;3x 10 Supino + 0x 10 Remada;Peito`)).toThrow('Linha 3');
});

it('rejects a workout with extra malformed parenthetical data', () => {
    expect(() => validateRoutineCsv(`${header}\nTerça-feira;18:00;Musculação;3x 10 Supino (???);Peito`)).toThrow('Linha 2');
});

it('keeps the first data row as the anchor even when it is a meal', () => {
    const preview = validateRoutineCsv(`${header}\nTerça-feira;07:00;Café;Ovos;Energia\nQuarta-feira;18:00;HIT;1x 25min Treino HIT;Cardio`);
    expect(preview.firstRow).toMatchObject({ day: 'Terça-feira', time: '07:00', activity: 'Café' });
});

it('rejects an empty focus/motive even if a valid workout prescription is present', () => {
    expect(() => validateRoutineCsv(`${header}\nQuarta-feira;06:30;HIT;1x 25min Treino HIT;`)).toThrow('Linha 2');
});

it('preserves the original CSV row order for the anchored weekly cycle', () => {
    const plan = validateRoutineCsv(`${header}\nQuarta-feira;10:00;Café;Ovos;Energia\nSegunda-feira;07:00;Café;Pão;Energia`);
    expect(plan.rows.map((row) => row.day)).toEqual(['Quarta-feira', 'Segunda-feira']);
});

it('keeps arbitrary meal labels with ordinary text descriptions', () => {
    const preview = validateRoutineCsv(`${header}\nSegunda-feira;12:00;Almoço especial;Arroz e feijão;Proteína`);
    expect(preview.meals[0].activity).toBe('Almoço especial');
});

it('rejects workout-shaped content under an unknown activity but leaves non-workout meals free text', () => {
    expect(validateRoutineCsv(`${header}\nSegunda-feira;12:00;Almoço especial;Arroz e feijão;Proteína`).meals).toHaveLength(1);
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;18:00;Corrida;3x 10 Sprint;Cardio`)).toThrow('Linha 2');
});

it('rejects a workout description with a missing exercise name', () => {
    expect(() => validateRoutineCsv(`${header}\nTerça-feira;18:00;Musculação;3x 10;Peito`)).toThrow('Linha 2');
});

it('does not produce a partial preview if a later weekday is invalid', () => {
    expect(() => validateRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia\nDia 8;18:00;HIT;1x 25min Treino HIT;Cardio`)).toThrow('Linha 3');
});
